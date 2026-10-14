// test/audit-theme.js
import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) results = results.concat(walk(full));
    else if (file.endsWith('.jsx') || file.endsWith('.css') || file.endsWith('.tsx')) results.push(full);
  });
  return results;
}

const files = walk('src');
console.log(`Auditing ${files.length} files in src/ for hardcoded theme-breaking colors...`);

files.forEach((f) => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  const matches = [];

  lines.forEach((l, i) => {
    // Check for hardcoded hex colors or inline light backgrounds
    if (/(background|color|border-color|borderColor|backgroundColor):\s*['"]?#(?:fff|f8|f9|eff|fffbeb|ecf|fee|dbe|bfd|1e293b|0f172a|334155|475569|64748b)/i.test(l)) {
      matches.push(`${i + 1}: ${l.trim()}`);
    }
  });

  if (matches.length > 0) {
    console.log(`\n=== ${f} (${matches.length} matches) ===`);
    matches.forEach((m) => console.log('  ' + m));
  }
});
