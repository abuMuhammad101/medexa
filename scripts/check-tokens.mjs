// Fails if any colour, px spacing/radius or shadow literal appears in src/ outside tokens.css.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const ALLOW = ['styles/tokens.css', 'lib/pdf.ts'];
const patterns = [
  { re: /#[0-9a-fA-F]{3,8}\b(?![\w-])/g, what: 'hex colour' },
  { re: /\brgba?\(/g, what: 'rgb() colour' },
  { re: /\bhsla?\(/g, what: 'hsl() colour' },
  { re: /\[\d+px\]|\b\d+px\b/g, what: 'px literal' },
];

const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(f)) files.push(p);
  }
};
walk(root);

let bad = 0;
for (const f of files) {
  const rel = relative(root, f).replace(/\\/g, '/');
  if (ALLOW.includes(rel) || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')) continue;
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
    for (const { re, what } of patterns) {
      re.lastIndex = 0;
      const m = line.match(re);
      if (m) {
        // allow ids like aria-controls="#..." – none expected; report everything else
        bad++;
        console.log(`${rel}:${i + 1}  ${what}: ${m.join(', ')}`);
      }
    }
  });
}
if (bad) {
  console.error(`\n${bad} hard-coded design value(s) found outside tokens.css`);
  process.exit(1);
}
console.log(`Token check passed (${files.length} files).`);
