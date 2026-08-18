const fs = require('fs');
const file = process.argv[2] || 'src/main.js';
const src = fs.readFileSync(file, 'utf8');
let depth = 0;
let inStr = null;
let inTmpl = false;
let esc = false;
for (let i = 0; i < src.length; i++) {
  const c = src[i];
  if (esc) { esc = false; continue; }
  if (c === '\\') { esc = true; continue; }
  if (inStr) { if (c === inStr) inStr = null; continue; }
  if (c === '`') { inTmpl = !inTmpl; continue; }
  if (inTmpl) continue;
  if (c === '"' || c === "'") { inStr = c; continue; }
  if (c === '{') depth++;
  if (c === '}') depth--;
}
if (depth !== 0) {
  console.error('BRACE IMBALANCE: depth=' + depth);
  process.exit(1);
}
console.log('BRACES OK');