#!/usr/bin/env node
'use strict';

/*
 * Data-contract drift guard (see docs/database/CONSOLE_DATA_LAYER.md, section 3).
 *
 * Statically extracts the table + column names each console service reads and
 * writes, then validates every high-confidence column reference against the
 * generated schema truth (src/types/database.ts). Any column a service reads or
 * writes that does NOT exist for that table in database.ts is a phantom
 * read/write (the adminService profiles.status / suspended_at /
 * verification_status class) and FAILS the build.
 *
 * What is verified (high-confidence static matches only):
 *   - .from('<table>').select('a, b, c')            -> a, b, c are columns of <table>
 *   - .from('<table>').eq('col', ...) / .in / .is / .gt / .order / ... (see
 *     FILTER_METHODS) directly chained -> 'col' is a column of <table>
 *   - .from('<table>').insert({ ... }) / .update({ ... }) / .upsert({ ... })
 *     -> the object's literal keys are columns of <table>
 *   - .from(TABLE_NAME) where TABLE_NAME is a module-level string const is
 *     resolved to its literal value.
 *
 * What is SKIPPED and reported as 'unverified' (never fails):
 *   - dynamic selects ('*', template strings, aliased / relation / computed
 *     column expressions like org:organizations(name), col::date, count)
 *   - dynamic filter args (a variable, or a dotted foreign path like a.b)
 *   - dynamic writes (.update(payload) where the arg is not an object literal)
 *   - .from(<expr>) that does not resolve to a literal table name
 *   - resolved tables that are not present in database.ts (views / unpublished /
 *     app-owned relations we cannot verify from the generated types)
 *
 * Comments, string bodies and regex literals are neutralized before scanning so
 * doc-comment examples and regex punctuation cannot produce false findings.
 *
 * All literal building blocks in this file are pure ASCII; it does not embed any
 * non-ASCII byte, so it never trips the mojibake guard.
 *
 * Usage:
 *   node scripts/check-data-contract.js
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const frontendRoot = path.resolve(__dirname, '..');
const SCHEMA_FILE = path.join(frontendRoot, 'src', 'types', 'database.ts');
const SERVICES_DIR = path.join(frontendRoot, 'src', 'services');

const TAG = '[data-contract]';

// Methods whose FIRST string-literal argument is a single base-table column.
const FILTER_METHODS = new Set([
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'like', 'ilike', 'is', 'in',
  'contains', 'containedBy', 'order', 'filter', 'not',
]);
// Methods that take an object literal whose keys are columns.
const WRITE_METHODS = new Set(['insert', 'update', 'upsert']);
// Methods that take a { col: value } filter object.
const MATCH_METHODS = new Set(['match']);

// Baseline of KNOWN phantom references, grandfathered as tracked debt so this guard
// ships green and gates NEW drift only. Key is "service|table|column". Remove an entry
// once the service is fixed (see CONSOLE_DATA_LAYER.md section 3):
//   - onboardingService verify/reject flow writes hospitals.verified_at / rejected_at /
//     rejection_reason + profiles.verification_status (part of the not-yet-proved
//     registration flow already held out of the hardgate).
//   - searchService / staffSchedulingService read ambulances.hospital (should be
//     hospital_id, or a hospitals join).
const BASELINE = new Set([
  'onboardingService.js|hospitals|rejected_at',
  'onboardingService.js|hospitals|rejection_reason',
  'onboardingService.js|hospitals|verified_at',
  'onboardingService.js|profiles|verification_status',
  'searchService.js|ambulances|hospital',
  'staffSchedulingService.js|ambulances|hospital',
]);

// ---------------------------------------------------------------------------
// Generic balanced-span helpers (string-aware).
// ---------------------------------------------------------------------------

function skipString(str, i) {
  const quote = str[i];
  i += 1;
  while (i < str.length) {
    const c = str[i];
    if (c === '\\') { i += 2; continue; }
    if (c === quote) return i + 1;
    i += 1;
  }
  return i;
}

// openIdx points at one of ( { [ ; returns { body, end } where end is the index
// of the matching close char. String contents are skipped so brackets inside a
// string literal do not affect depth.
function matchBalanced(str, openIdx) {
  const open = str[openIdx];
  const close = open === '(' ? ')' : open === '{' ? '}' : open === '[' ? ']' : '';
  let depth = 0;
  let i = openIdx;
  while (i < str.length) {
    const c = str[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(str, i); continue; }
    if (c === open) {
      depth += 1;
    } else if (c === close) {
      depth -= 1;
      if (depth === 0) return { body: str.slice(openIdx + 1, i), end: i };
    }
    i += 1;
  }
  return { body: str.slice(openIdx + 1), end: str.length - 1 };
}

// Split on a top-level delimiter, ignoring anything nested in ( ) [ ] { } or
// inside a string literal.
function splitTopLevel(str, delim) {
  const parts = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < str.length) {
    const c = str[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(str, i); continue; }
    if (c === '(' || c === '[' || c === '{') { depth += 1; i += 1; continue; }
    if (c === ')' || c === ']' || c === '}') { depth -= 1; i += 1; continue; }
    if (c === delim && depth === 0) {
      parts.push(str.slice(start, i));
      start = i + 1;
    }
    i += 1;
  }
  parts.push(str.slice(start));
  return parts;
}

// ---------------------------------------------------------------------------
// Comment / string / regex neutralizer.
//
// Replaces comment bodies (and regex literal bodies) with spaces while keeping
// the byte length and newlines intact, so char offsets and line numbers stay
// accurate. String literals are left intact (we need .from('x') / .select('y')).
// ---------------------------------------------------------------------------

const REGEX_PRECEDERS = new Set([
  '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', ';', '+', '-', '*', '%',
  '<', '>', '~', '^', '\n', '',
]);

function neutralizeComments(src) {
  const out = src.split('');
  const n = src.length;
  let i = 0;
  let prev = '';
  while (i < n) {
    const c = src[i];
    const c2 = i + 1 < n ? src[i + 1] : '';
    if (c === '/' && c2 === '/') {
      // line comment
      out[i] = ' ';
      out[i + 1] = ' ';
      i += 2;
      while (i < n && src[i] !== '\n') { out[i] = ' '; i += 1; }
      continue;
    }
    if (c === '/' && c2 === '*') {
      // block comment
      out[i] = ' ';
      out[i + 1] = ' ';
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] !== '\n') out[i] = ' ';
        i += 1;
      }
      if (i < n) { out[i] = ' '; out[i + 1] = ' '; i += 2; }
      prev = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      // keep string body; skip past it
      const end = skipString(src, i);
      i = end;
      prev = 'x';
      continue;
    }
    if (c === '/' && REGEX_PRECEDERS.has(prev)) {
      // regex literal: blank its body so quotes / slashes inside cannot be
      // mistaken for strings or comments.
      out[i] = ' ';
      i += 1;
      let inClass = false;
      while (i < n) {
        const rc = src[i];
        if (rc === '\n') break;
        if (rc === '\\') { out[i] = ' '; out[i + 1] = ' '; i += 2; continue; }
        if (rc === '[') { inClass = true; out[i] = ' '; i += 1; continue; }
        if (rc === ']') { inClass = false; out[i] = ' '; i += 1; continue; }
        if (rc === '/' && !inClass) { out[i] = ' '; i += 1; break; }
        out[i] = ' ';
        i += 1;
      }
      // blank trailing flags
      while (i < n && /[a-z]/i.test(src[i])) { out[i] = ' '; i += 1; }
      prev = 'x';
      continue;
    }
    if (!/\s/.test(c)) prev = c;
    i += 1;
  }
  return out.join('');
}

// ---------------------------------------------------------------------------
// Schema parsing: database.ts -> Map<table, Set<column>>.
// ---------------------------------------------------------------------------

function extractRowColumns(tableBody) {
  const rowMatch = /\bRow\s*:\s*\{/.exec(tableBody);
  if (!rowMatch) return null;
  const braceIdx = rowMatch.index + rowMatch[0].length - 1;
  const { body } = matchBalanced(tableBody, braceIdx);
  const cols = new Set();
  const re = /(?:^|\n)\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g;
  let m;
  while ((m = re.exec(body)) !== null) cols.add(m[1]);
  return cols;
}

function collectTablesFromSection(sectionBody, out) {
  let i = 0;
  const n = sectionBody.length;
  while (i < n) {
    const rest = sectionBody.slice(i);
    const m = /^\s*,?\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{/.exec(rest);
    if (m) {
      const name = m[1];
      const braceIdx = i + m[0].length - 1;
      const { body, end } = matchBalanced(sectionBody, braceIdx);
      const cols = extractRowColumns(body);
      if (cols) out.set(name, cols);
      i = end + 1;
      continue;
    }
    i += 1;
  }
}

function parseSchema() {
  const text = fs.readFileSync(SCHEMA_FILE, 'utf8');
  const pubIdx = text.indexOf('\n  public: {');
  if (pubIdx === -1) throw new Error('could not locate the public schema block in database.ts');
  const braceIdx = text.indexOf('{', pubIdx);
  const { body: publicBody } = matchBalanced(text, braceIdx);
  const tables = new Map();
  for (const section of ['Tables', 'Views']) {
    const marker = '\n    ' + section + ': {';
    const sIdx = publicBody.indexOf(marker);
    if (sIdx === -1) continue;
    const sBrace = publicBody.indexOf('{', sIdx);
    const { body: sectionBody } = matchBalanced(publicBody, sBrace);
    collectTablesFromSection(sectionBody, tables);
  }
  return tables;
}

// ---------------------------------------------------------------------------
// Service scanning.
// ---------------------------------------------------------------------------

function lineIndexer(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') starts.push(i + 1);
  }
  return function lineOf(index) {
    // binary search
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= index) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  };
}

function buildConstMap(src) {
  const map = new Map();
  const re = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"])([A-Za-z_][A-Za-z0-9_]*)\2/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (!map.has(m[1])) map.set(m[1], m[3]);
  }
  return map;
}

function leadingStringLiteral(argsText) {
  const m = /^\s*(['"`])/.exec(argsText);
  if (!m) return null;
  const quote = m[1];
  if (quote === '`') return { dynamic: true };
  const start = m.index + m[0].length - 1;
  const end = skipString(argsText, start);
  const value = argsText.slice(start + 1, end - 1);
  return { value, dynamic: false };
}

function parseSelectColumns(argsText) {
  const lit = leadingStringLiteral(argsText);
  if (!lit || lit.dynamic) return { columns: [], dynamic: true };
  const raw = lit.value;
  const columns = [];
  let dynamic = false;
  for (let part of splitTopLevel(raw, ',')) {
    part = part.trim();
    if (!part || part === '*') continue;
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) columns.push(part);
    else dynamic = true;
  }
  return { columns, dynamic };
}

function parseColumnArg(argsText) {
  const lit = leadingStringLiteral(argsText);
  if (!lit || lit.dynamic) return { column: null, dynamic: true };
  const v = lit.value.trim();
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(v)) return { column: v, dynamic: false };
  return { column: null, dynamic: true };
}

function objectKeys(body) {
  const keys = [];
  let depth = 0;
  let i = 0;
  let expectKey = true;
  const n = body.length;
  while (i < n) {
    const c = body[i];
    if (c === '"' || c === "'" || c === '`') {
      if (depth === 0 && expectKey) {
        const end = skipString(body, i);
        const raw = body.slice(i + 1, end - 1);
        // only a real key if followed by a colon
        let j = end;
        while (j < n && /\s/.test(body[j])) j += 1;
        if (body[j] === ':' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(raw)) keys.push(raw);
        i = end;
        expectKey = false;
        continue;
      }
      i = skipString(body, i);
      continue;
    }
    if (c === '{' || c === '[' || c === '(') { depth += 1; i += 1; expectKey = false; continue; }
    if (c === '}' || c === ']' || c === ')') { depth -= 1; i += 1; continue; }
    if (depth === 0) {
      if (c === ',') { expectKey = true; i += 1; continue; }
      if (expectKey && /\s/.test(c)) { i += 1; continue; }
      if (expectKey) {
        if (body.startsWith('...', i)) { i += 3; expectKey = false; continue; }
        const km = /^([A-Za-z_$][\w$]*)/.exec(body.slice(i));
        if (km) { keys.push(km[1]); i += km[1].length; expectKey = false; continue; }
        expectKey = false;
        i += 1;
        continue;
      }
    }
    i += 1;
  }
  return keys;
}

function parseWriteKeys(argsText) {
  const objStart = argsText.indexOf('{');
  if (objStart === -1) return { keys: [], dynamic: true };
  const { body } = matchBalanced(argsText, objStart);
  return { keys: objectKeys(body), dynamic: false };
}

function resolveTable(argsText, constMap) {
  const t = argsText.trim();
  const sm = /^(['"])([A-Za-z_][A-Za-z0-9_]*)\1$/.exec(t);
  if (sm) return { table: sm[2], resolved: true };
  if (/^[A-Za-z_$][\w$]*$/.test(t)) {
    if (constMap.has(t)) return { table: constMap.get(t), resolved: true };
    return { table: null, resolved: false, expr: t };
  }
  return { table: null, resolved: false, expr: t.slice(0, 40) };
}

// Walk the fluent call chain that is DIRECTLY chained after a .from(...) call.
// Returns the list of { table, column, kind, index } column references plus
// unverified counters.
function walkChain(src, startIndex, table, lineOf, stats, findings, serviceName, schema) {
  let pos = startIndex;
  const n = src.length;
  const tableKnown = schema.has(table);
  const cols = tableKnown ? schema.get(table) : null;

  const record = (column, kind, index) => {
    stats.checkedRefs += 1;
    if (!cols.has(column)) {
      findings.push({
        service: serviceName,
        table,
        column,
        kind,
        line: lineOf(index),
      });
    }
  };

  while (pos < n) {
    let j = pos;
    while (j < n && /\s/.test(src[j])) j += 1;
    if (src[j] !== '.') break;
    const after = src.slice(j + 1);
    const mm = /^([A-Za-z_$][\w$]*)\s*\(/.exec(after);
    if (!mm) break;
    const method = mm[1];
    const parenOpen = j + 1 + mm[0].length - 1;
    const { body: argsText, end } = matchBalanced(src, parenOpen);
    const atLine = parenOpen;

    if (method === 'select') {
      if (!tableKnown) {
        stats.unknownTableRefs += 1;
      } else {
        const { columns, dynamic } = parseSelectColumns(argsText);
        for (const col of columns) record(col, 'read', atLine);
        if (dynamic) stats.dynamicSelects += 1;
      }
    } else if (FILTER_METHODS.has(method)) {
      const { column, dynamic } = parseColumnArg(argsText);
      if (dynamic) {
        stats.dynamicFilterArgs += 1;
      } else if (!tableKnown) {
        stats.unknownTableRefs += 1;
      } else {
        record(column, 'read', atLine);
      }
    } else if (WRITE_METHODS.has(method)) {
      const { keys, dynamic } = parseWriteKeys(argsText);
      if (dynamic) {
        stats.dynamicWrites += 1;
      } else if (!tableKnown) {
        stats.unknownTableRefs += 1;
      } else {
        for (const key of keys) record(key, 'write', atLine);
      }
    } else if (MATCH_METHODS.has(method)) {
      const { keys, dynamic } = parseWriteKeys(argsText);
      if (dynamic) {
        stats.dynamicFilterArgs += 1;
      } else if (!tableKnown) {
        stats.unknownTableRefs += 1;
      } else {
        for (const key of keys) record(key, 'read', atLine);
      }
    }
    // any other chained method is ignored (limit/range/single/or/... )

    pos = end + 1;
  }
}

function scanService(filePath, schema, stats, findings) {
  const serviceName = path.basename(filePath);
  const rawSource = fs.readFileSync(filePath, 'utf8');
  const src = neutralizeComments(rawSource);
  const lineOf = lineIndexer(src);
  const constMap = buildConstMap(src);

  const fromRe = /\.from\s*\(/g;
  let fm;
  while ((fm = fromRe.exec(src)) !== null) {
    const parenOpen = fm.index + fm[0].length - 1;
    const { body: argsText, end } = matchBalanced(src, parenOpen);
    const { table, resolved } = resolveTable(argsText, constMap);
    if (!resolved) {
      stats.unresolvedFroms += 1;
      continue;
    }
    stats.resolvedFroms += 1;
    if (!schema.has(table)) {
      stats.unknownTables.add(table);
    }
    walkChain(src, end + 1, table, lineOf, stats, findings, serviceName, schema);
  }
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------

function main() {
  let schema;
  try {
    schema = parseSchema();
  } catch (error) {
    console.error(`${TAG} FAILED to parse schema truth: ${error.message}`);
    process.exit(1);
    return;
  }
  if (schema.size === 0) {
    console.error(`${TAG} FAILED: parsed 0 tables from database.ts (parser or file problem).`);
    process.exit(1);
    return;
  }

  let serviceFiles;
  try {
    serviceFiles = fs.readdirSync(SERVICES_DIR)
      .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
      .sort()
      .map((name) => path.join(SERVICES_DIR, name));
  } catch (error) {
    console.error(`${TAG} FAILED to read services directory: ${error.message}`);
    process.exit(1);
    return;
  }

  const stats = {
    checkedRefs: 0,
    resolvedFroms: 0,
    unresolvedFroms: 0,
    dynamicSelects: 0,
    dynamicFilterArgs: 0,
    dynamicWrites: 0,
    unknownTableRefs: 0,
    unknownTables: new Set(),
  };
  const findings = [];

  for (const filePath of serviceFiles) {
    scanService(filePath, schema, stats, findings);
  }

  // Report.
  console.log(`${TAG} scanned ${serviceFiles.length} service file(s) against ${schema.size} tables/views in database.ts.`);
  console.log(`${TAG} verified ${stats.checkedRefs} high-confidence column reference(s) across ${stats.resolvedFroms} resolved .from() call(s).`);

  const unverifiedTotal = stats.dynamicSelects + stats.dynamicFilterArgs
    + stats.dynamicWrites + stats.unresolvedFroms + stats.unknownTableRefs;
  console.log(`${TAG} unverified (skipped, not failed): ${unverifiedTotal} `
    + `[dynamic-selects=${stats.dynamicSelects}, dynamic-filter-args=${stats.dynamicFilterArgs}, `
    + `dynamic-writes=${stats.dynamicWrites}, unresolved-from=${stats.unresolvedFroms}, `
    + `refs-on-unknown-tables=${stats.unknownTableRefs}].`);
  if (stats.unknownTables.size > 0) {
    const names = Array.from(stats.unknownTables).sort().join(', ');
    console.log(`${TAG} note: ${stats.unknownTables.size} referenced relation(s) not in database.ts (not verifiable, skipped): ${names}.`);
  }

  findings.sort((a, b) => (
    a.service.localeCompare(b.service)
    || a.table.localeCompare(b.table)
    || a.column.localeCompare(b.column)
  ));
  const findingKey = (f) => `${f.service}|${f.table}|${f.column}`;
  const newFindings = findings.filter((f) => !BASELINE.has(findingKey(f)));
  const baselined = findings.filter((f) => BASELINE.has(findingKey(f)));

  const printGroup = (list, stream) => {
    let lastService = '';
    let lastTable = '';
    for (const f of list) {
      if (f.service !== lastService) { stream(`  ${f.service}`); lastService = f.service; lastTable = ''; }
      if (f.table !== lastTable) { stream(`    ${f.table}`); lastTable = f.table; }
      stream(`      ${f.column}  (${f.kind}, line ${f.line}) - not a column of '${f.table}' in database.ts`);
    }
  };

  if (baselined.length > 0) {
    console.log('');
    console.log(`${TAG} KNOWN DEBT (baselined, NOT failing) - ${baselined.length} grandfathered phantom ref(s); fix + remove from BASELINE:`);
    printGroup(baselined, (s) => console.log(s));
  }

  if (newFindings.length > 0) {
    console.error('');
    console.error(`${TAG} NEW phantom column reference(s) found (service -> table -> unknown column):`);
    printGroup(newFindings, (s) => console.error(s));
    console.error('');
    console.error(`${TAG} FAILED - ${newFindings.length} NEW phantom column reference(s) (not in BASELINE). `
      + 'Gate the feature off or fix the service to match the schema truth (src/types/database.ts).');
    process.exit(1);
    return;
  }

  console.log(`${TAG} OK - no NEW phantom column reads/writes (${baselined.length} baselined debt tracked).`);
}

main();
