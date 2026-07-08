#!/usr/bin/env node
'use strict';

/*
 * Mojibake / encoding guard for docs + source.
 *
 * Catches corruption that leaks into text files:
 *   1. U+FFFD replacement character - the visible "diamond question mark"; it
 *      only ever appears as the residue of a failed decode, never legitimately.
 *   2. Invalid UTF-8 byte sequences - a fatal decode.
 *   3. BOM (UTF-16 LE/BE, UTF-8)     - re-encode as UTF-8 without BOM.
 *   4. NUL bytes                     - text file treated as binary.
 *   5. Classic double-encoding       - UTF-8 read as CP1252 then re-saved
 *      (accented-latin, smart-punctuation and emoji families).
 *
 * All mojibake signatures are built from hex code points via String.fromCharCode,
 * so the source of this file is pure ASCII and does not trip its own scan.
 *
 * Usage:
 *   node scripts/check-mojibake.js                 # full scan of SCAN_DIRS
 *   node scripts/check-mojibake.js <file> [file..] # scan given (repo-relative) files
 */

const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('util');

const repoRoot = path.resolve(__dirname, '..', '..');

// Scanned recursively when no explicit file arguments are passed.
const SCAN_DIRS = ['frontend/docs', 'frontend/src'];
const TEXT_EXT = new Set([
  '.md', '.mdx', '.js', '.jsx', '.ts', '.tsx',
  '.css', '.json', '.txt', '.html', '.sql', '.yml', '.yaml',
]);
const SKIP_DIRS = new Set(['node_modules', 'build', 'dist', '.git', 'coverage']);

const cc = String.fromCharCode;

// U+FFFD replacement character.
const REPLACEMENT = cc(0xfffd);

// Classic "UTF-8 decoded as CP1252 then re-saved as UTF-8" signatures:
//   C3 xx  (U+00C3 + continuation-range char) -> accented latin (e-acute, a-grave, ...)
//   E2 80 AC (U+00E2 U+20AC)                   -> smart punctuation / dashes
//   F0 9F  (U+00F0 + U+0178/U+009F)            -> emoji lead bytes
const MOJIBAKE_RE = new RegExp(
  cc(0x00c3) + '[' + cc(0x0080) + '-' + cc(0x00bf) + ']'
  + '|' + cc(0x00e2) + cc(0x20ac)
  + '|' + cc(0x00f0) + '[' + cc(0x0178) + cc(0x009f) + ']'
);

const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
const findings = [];

function fail(file, message) {
  findings.push({ file, message });
}

function rel(absoluteFile) {
  return path.relative(repoRoot, absoluteFile).split(path.sep).join('/');
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function checkFile(absoluteFile) {
  if (!fs.existsSync(absoluteFile)) return;
  if (!TEXT_EXT.has(path.extname(absoluteFile).toLowerCase())) return;

  const bytes = fs.readFileSync(absoluteFile);
  const name = rel(absoluteFile);

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return fail(name, 'UTF-16 LE BOM detected. Re-encode as UTF-8 without BOM.');
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return fail(name, 'UTF-16 BE BOM detected. Re-encode as UTF-8 without BOM.');
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return fail(name, 'UTF-8 BOM detected. Re-encode as UTF-8 without BOM.');
  }
  if (bytes.includes(0)) {
    return fail(name, 'NUL byte detected (text file treated as binary).');
  }

  let text;
  try {
    text = utf8Decoder.decode(bytes);
  } catch (error) {
    return fail(name, `invalid UTF-8: ${error.message}`);
  }

  const fffd = text.indexOf(REPLACEMENT);
  if (fffd !== -1) {
    return fail(name, `U+FFFD replacement character at line ${lineOf(text, fffd)} (corrupted character).`);
  }

  const m = MOJIBAKE_RE.exec(text);
  if (m) {
    return fail(name, `double-encoded mojibake sequence at line ${lineOf(text, m.index)}.`);
  }
}

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      checkFile(path.join(dir, entry.name));
    }
  }
}

const args = process.argv.slice(2);
if (args.length > 0) {
  for (const arg of args) {
    checkFile(path.isAbsolute(arg) ? arg : path.join(repoRoot, arg));
  }
} else {
  for (const dir of SCAN_DIRS) walk(path.join(repoRoot, dir));
}

if (findings.length > 0) {
  for (const { file, message } of findings) {
    console.error(`[mojibake-check] ${file}: ${message}`);
  }
  console.error(`[mojibake-check] FAILED - ${findings.length} file(s) contain encoding corruption.`);
  process.exit(1);
}

console.log('[mojibake-check] No mojibake or encoding corruption found.');
