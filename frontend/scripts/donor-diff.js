#!/usr/bin/env node
'use strict';

// donor-diff -- bidirectional element-inventory parity between a DONOR file and a
// CONSUMER file (+ optional universe of kit files the consumer composes).
//
// Lesson 26 countermeasures (docs/ui-ux/UIUX_REVAMP_PROCESS_AND_LESSONS.md):
//   (a) "Sampled reading"        -> build the donor's FULL mechanical inventory, then diff.
//   (d) "Directional blindness"  -> report BOTH directions: missing AND exceeding.
//       Superset drift is drift.
//
// Usage:
//   node scripts/donor-diff.js <donorFile> <consumerFile> [--universe fileA,fileB,...] [--git-base <ref>] [--strict]
//
//   <donorFile> / <consumerFile> may be plain paths OR git specs of the form
//   "ref:path" (e.g. "45bc5d8f~1:frontend/src/components/mobile/MobileVisits.jsx").
//   Git-spec paths are repo-root-relative (native `git show` semantics).
//
//   --universe   comma-separated extra files whose contents count as part of the
//                CONSUMER for the "missing" direction (the kit a page composes).
//                May be passed multiple times. Universe files do NOT count toward
//                the "exceeding" direction (a shared kit legitimately holds more
//                than any one donor).
//   --git-base   read the DONOR from this git ref when the donor arg is a plain
//                path -- lets you compare a file's own past vs present:
//                  node scripts/donor-diff.js src/X.jsx src/X.jsx --git-base HEAD~2
//   --strict     exit non-zero when the donor-missing list is non-empty.
//                Without it the exit code is always 0 (report-only).
//
// Inventory categories extracted from each side:
//   1. className tokens  -- every whitespace token of every class-string literal:
//      double/single-quoted strings, template-literal STATIC parts, and bare
//      class-string consts (object values like `62: '...'` and assignments
//      `= '...'`). A class-string is any string literal matching the
//      tailwind-ish heuristic /(rounded|bg-|text-|flex|grid|h-|w-|px-|py-|shadow|gap-)/.
//   2. aria-*             -- attribute names, plus name="value" pairs for static values.
//   3. data-*             -- attribute names.
//   4. components         -- JSX PascalCase element names (<Card, <GroupedList, ...).
//   5. visible strings    -- JSX text nodes + static label= / title= / placeholder= /
//                            aria-label= / any *Label props (attr `=` and object-literal
//                            `:` forms); recorded as bare values so prop renames that
//                            keep the user-visible string still count as parity.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const USAGE =
  'Usage: node scripts/donor-diff.js <donorFile> <consumerFile> [--universe fileA,fileB,...] [--git-base <ref>] [--strict]';

const CLASS_STRING_RE = /(rounded|bg-|text-|flex|grid|h-|w-|px-|py-|shadow|gap-)/;
const LABEL_PROP_NAMES = new Set(['label', 'title', 'placeholder', 'aria-label']);

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { positional: [], universe: [], gitBase: null, strict: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--strict') {
      args.strict = true;
    } else if (a === '--universe') {
      const value = argv[++i];
      if (!value) fail('--universe requires a comma-separated file list.');
      args.universe.push(...value.split(',').map((s) => s.trim()).filter(Boolean));
    } else if (a.startsWith('--universe=')) {
      args.universe.push(...a.slice('--universe='.length).split(',').map((s) => s.trim()).filter(Boolean));
    } else if (a === '--git-base') {
      args.gitBase = argv[++i];
      if (!args.gitBase) fail('--git-base requires a git ref.');
    } else if (a.startsWith('--git-base=')) {
      args.gitBase = a.slice('--git-base='.length);
    } else if (a.startsWith('--')) {
      fail('Unknown flag: ' + a);
    } else {
      args.positional.push(a);
    }
  }
  if (args.positional.length !== 2) fail('Expected exactly a <donorFile> and a <consumerFile>.');
  return args;
}

function fail(message) {
  console.error('donor-diff: ' + message);
  console.error(USAGE);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Source loading (filesystem or git ref:path)
// ---------------------------------------------------------------------------

// "ref:path" -- the pre-colon part must be longer than one char so Windows
// drive paths (C:/...) stay filesystem paths.
function parseGitSpec(spec) {
  const m = /^([^:\\/]{2,}):(.+)$/.exec(spec);
  if (m) return { ref: m[1], gitPath: m[2] };
  return null;
}

function gitShow(ref, gitPath) {
  try {
    return execFileSync('git', ['show', ref + ':' + gitPath.replace(/\\/g, '/')], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    fail('git show failed for "' + ref + ':' + gitPath + '" -- ' + String(err.message).split('\n')[0]);
  }
}

// Convert a cwd-relative or absolute path to a repo-root-relative path for `git show`.
function toRepoRelative(filePath) {
  const topLevel = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const absolute = path.resolve(filePath);
  return path.relative(topLevel, absolute).replace(/\\/g, '/');
}

function loadSource(spec, opts) {
  const gitSpec = parseGitSpec(spec);
  if (gitSpec) {
    return { label: spec, source: gitShow(gitSpec.ref, gitSpec.gitPath) };
  }
  if (opts && opts.gitBase) {
    const repoRelative = toRepoRelative(spec);
    return {
      label: opts.gitBase + ':' + repoRelative,
      source: gitShow(opts.gitBase, repoRelative),
    };
  }
  if (!fs.existsSync(spec)) fail('File not found: ' + spec);
  return { label: spec, source: fs.readFileSync(spec, 'utf8') };
}

// ---------------------------------------------------------------------------
// Scanner: walk the source once, producing
//   - literals: every string literal (and every template-literal STATIC part),
//     each with the trailing run of code that precedes it (for context checks)
//   - codeOnly: the source with comments and string CONTENTS blanked out
//     (quotes and structure kept), so JSX text / attr names / element names
//     can be regexed without string-content false positives.
// ---------------------------------------------------------------------------

function scanSource(source) {
  const literals = [];
  const code = [];
  // Frame stack: {t:'code', depth, fromTpl} | {t:'tpl', buf}
  const stack = [{ t: 'code', depth: 0, fromTpl: false }];
  const n = source.length;
  let i = 0;

  const pushLiteral = (raw) => {
    const value = raw.replace(/\\(.)/g, '$1');
    const prefix = code.join('').slice(-100);
    literals.push({ value, prefix });
  };

  while (i < n) {
    const frame = stack[stack.length - 1];
    const c = source[i];
    const d = i + 1 < n ? source[i + 1] : '';

    if (frame.t === 'code') {
      if (c === '/' && d === '/') {
        while (i < n && source[i] !== '\n') i++;
        continue; // the newline itself is pushed on the next iteration
      }
      if (c === '/' && d === '*') {
        i += 2;
        while (i < n && !(source[i] === '*' && source[i + 1] === '/')) i++;
        i += 2;
        code.push(' ');
        continue;
      }
      if (c === "'" || c === '"') {
        const quote = c;
        i++;
        let buf = '';
        while (i < n && source[i] !== quote && source[i] !== '\n') {
          if (source[i] === '\\') {
            buf += source[i] + (source[i + 1] || '');
            i += 2;
          } else {
            buf += source[i];
            i++;
          }
        }
        i++; // past the closing quote (or the newline of an unterminated string)
        code.push(quote);
        pushLiteral(buf);
        code.push(quote);
        continue;
      }
      if (c === '`') {
        stack.push({ t: 'tpl', buf: '' });
        code.push('`');
        i++;
        continue;
      }
      if (c === '{') {
        frame.depth++;
        code.push(c);
        i++;
        continue;
      }
      if (c === '}') {
        if (frame.depth > 0) {
          frame.depth--;
          code.push(c);
          i++;
          continue;
        }
        if (frame.fromTpl) {
          stack.pop(); // back to the enclosing template frame
          code.push('}');
          i++;
          continue;
        }
        code.push(c);
        i++;
        continue;
      }
      code.push(c);
      i++;
      continue;
    }

    // frame.t === 'tpl'
    if (c === '\\') {
      frame.buf += c + d;
      i += 2;
      continue;
    }
    if (c === '`') {
      if (frame.buf) pushLiteral(frame.buf);
      stack.pop();
      code.push('`');
      i++;
      continue;
    }
    if (c === '$' && d === '{') {
      if (frame.buf) {
        pushLiteral(frame.buf);
        frame.buf = '';
      }
      code.push('$', '{');
      stack.push({ t: 'code', depth: 0, fromTpl: true });
      i += 2;
      continue;
    }
    frame.buf += c;
    i++;
  }

  return { literals, codeOnly: code.join('') };
}

// ---------------------------------------------------------------------------
// Inventory extraction
// ---------------------------------------------------------------------------

function emptyInventory() {
  return {
    classNames: new Set(),
    aria: new Set(),
    data: new Set(),
    components: new Set(),
    visible: new Set(),
  };
}

function collapse(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function extractInventory(source, into) {
  const inv = into || emptyInventory();
  const { literals, codeOnly } = scanSource(source);

  for (const { value, prefix } of literals) {
    // 1. class-string tokens (covers className="...", template static parts,
    //    object values `62: '...'`, and assignments `= '...'`).
    if (CLASS_STRING_RE.test(value)) {
      for (const token of value.split(/\s+/)) {
        if (token) inv.classNames.add(token);
      }
    }

    // 2b. aria-* static values: prefix ends with `aria-foo=` / `aria-foo={` + quote.
    const ariaMatch = /(aria-[a-z-]+)\s*=\s*\{?\s*["'`]$/.exec(prefix);
    if (ariaMatch) {
      inv.aria.add(ariaMatch[1] + '="' + collapse(value) + '"');
    }

    // 5b. static label-ish props: label= / title= / placeholder= / aria-label=
    //     plus any *Label-suffixed prop (statsLabel=, entityLabel=, ...), in both
    //     attr `=` and object-literal `:` forms. Recorded as the bare VALUE --
    //     the visible string is what the user sees, so a prop rename that keeps
    //     the string is parity, not drift.
    const propMatch = /([A-Za-z][A-Za-z0-9-]*)\s*[=:]\s*\{?\s*["'`]$/.exec(prefix);
    if (
      propMatch &&
      (LABEL_PROP_NAMES.has(propMatch[1]) || /label$/i.test(propMatch[1])) &&
      collapse(value)
    ) {
      inv.visible.add(collapse(value));
    }

    // 3b. data-* names carried as string literals (kit indirection: a consumer
    //     passing dataAttr="data-mobile-visit-row", or a computed-key object
    //     like { 'data-status': ... }).
    if (/^data-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.trim())) {
      inv.data.add(value.trim());
    }
  }

  // 2a. aria-* attribute names.
  for (const m of codeOnly.match(/\baria-[a-z]+(?:-[a-z]+)*\b/g) || []) {
    inv.aria.add(m);
  }

  // 3. data-* attribute names.
  for (const m of codeOnly.match(/\bdata-[a-z0-9]+(?:-[a-z0-9]+)*\b/g) || []) {
    inv.data.add(m);
  }

  // 4. JSX PascalCase component names.
  const componentRe = /<([A-Z][A-Za-z0-9_.]*)/g;
  let cm;
  while ((cm = componentRe.exec(codeOnly)) !== null) {
    inv.components.add(cm[1]);
  }

  // 5a. JSX text nodes (from codeOnly, so attribute strings cannot leak in).
  const jsxTextRe = />([^<>{}`]+)</g;
  let tm;
  while ((tm = jsxTextRe.exec(codeOnly)) !== null) {
    const text = collapse(tm[1]);
    if (!text) continue;
    if (!/[A-Za-z]{2,}/.test(text)) continue; // needs at least one real word
    if (/[()=;]|&&|\|\|/.test(text)) continue; // looks like code, not copy
    if (text.length > 140) continue;
    inv.visible.add(text);
  }

  return inv;
}

// ---------------------------------------------------------------------------
// Diff + report
// ---------------------------------------------------------------------------

const CATEGORIES = [
  ['classNames', 'className tokens'],
  ['aria', 'aria-* (names + static values)'],
  ['data', 'data-* names'],
  ['components', 'JSX components'],
  ['visible', 'visible strings (JSX text + label props)'],
];

function sortedDiff(a, b) {
  const out = [];
  for (const item of a) if (!b.has(item)) out.push(item);
  return out.sort((x, y) => x.toLowerCase().localeCompare(y.toLowerCase()));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const [donorSpec, consumerSpec] = args.positional;

  const donor = loadSource(donorSpec, { gitBase: args.gitBase });
  const consumer = loadSource(consumerSpec);

  const donorInv = extractInventory(donor.source);
  const consumerInv = extractInventory(consumer.source);

  // consumer + universe: what the composed page can draw on (missing direction).
  const composedInv = extractInventory(consumer.source);
  const universeLabels = [];
  for (const file of args.universe) {
    const loaded = loadSource(file);
    universeLabels.push(loaded.label);
    extractInventory(loaded.source, composedInv);
  }

  console.log('donor-diff: bidirectional element-inventory parity (Lesson 26 a/d)');
  console.log('  donor    : ' + donor.label);
  console.log('  consumer : ' + consumer.label);
  console.log(
    '  universe : ' +
      (universeLabels.length ? universeLabels.length + ' file(s) counted into the consumer side' : '(none)')
  );
  for (const label of universeLabels) console.log('             - ' + label);
  console.log('');

  let totalMissing = 0;
  let totalExceeding = 0;

  for (const [key, title] of CATEGORIES) {
    const missing = sortedDiff(donorInv[key], composedInv[key]); // donor -> consumer(+universe)
    const exceeding = sortedDiff(consumerInv[key], donorInv[key]); // consumer file only -> donor
    totalMissing += missing.length;
    totalExceeding += exceeding.length;

    console.log('== ' + title + ' ' + '='.repeat(Math.max(1, 60 - title.length)));
    console.log(
      '   donor: ' +
        donorInv[key].size +
        ' unique | consumer: ' +
        consumerInv[key].size +
        ' | consumer+universe: ' +
        composedInv[key].size
    );
    console.log('   IN DONOR, MISSING FROM CONSUMER(+universe): ' + missing.length);
    for (const item of missing) console.log('     - ' + item);
    console.log('   IN CONSUMER, EXCEEDING DONOR: ' + exceeding.length);
    for (const item of exceeding) console.log('     + ' + item);
    console.log('');
  }

  console.log('== TOTALS ' + '='.repeat(54));
  console.log('   missing (donor not covered by consumer+universe): ' + totalMissing);
  console.log('   exceeding (consumer beyond donor -- superset drift is drift): ' + totalExceeding);

  if (args.strict && totalMissing > 0) {
    console.error('\ndonor-diff: STRICT FAIL -- ' + totalMissing + ' donor item(s) missing from the consumer(+universe).');
    process.exit(1);
  }
  console.log('\ndonor-diff: done.' + (args.strict ? ' Strict mode: missing list empty, pass.' : ' (report-only; use --strict to gate)'));
}

main();
