#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('util');

const repoRoot = path.resolve(__dirname, '..', '..');
const targets = [
  'frontend/src/types/database.ts',
  'frontend/supabase_types.ts',
];

const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
let hasError = false;

function fail(file, message) {
  hasError = true;
  console.error(`[encoding-check] ${file}: ${message}`);
}

for (const relativeFile of targets) {
  const absoluteFile = path.join(repoRoot, relativeFile);

  if (!fs.existsSync(absoluteFile)) {
    continue;
  }

  const bytes = fs.readFileSync(absoluteFile);

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    fail(relativeFile, 'UTF-16 LE BOM detected. Re-encode as UTF-8 without BOM.');
    continue;
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    fail(relativeFile, 'UTF-16 BE BOM detected. Re-encode as UTF-8 without BOM.');
    continue;
  }

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail(relativeFile, 'UTF-8 BOM detected. Re-encode as UTF-8 without BOM.');
    continue;
  }

  if (bytes.includes(0)) {
    fail(relativeFile, 'NUL bytes detected. TypeScript will treat this as binary input.');
    continue;
  }

  let text;
  try {
    text = utf8Decoder.decode(bytes);
  } catch (error) {
    fail(relativeFile, `invalid UTF-8: ${error.message}`);
    continue;
  }

  if (!text.includes('export type') && !text.includes('export interface')) {
    fail(relativeFile, 'does not look like generated TypeScript schema output.');
  }
}

if (hasError) {
  console.error('[encoding-check] Database type encoding guard failed.');
  process.exit(1);
}

console.log('[encoding-check] Database type files are UTF-8 without binary bytes.');
