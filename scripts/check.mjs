// Life OS quality gate. Run: npm run check
// Fails (exit 1) on token violations, banned patterns, or build errors.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
// Folders already migrated to tokens. Add new folders here as they are migrated.
const TOKEN_DIRS = ['src/components/review', 'src/components/landing', 'src/components/today', 'src/components/home', 'src/components/budget', 'src/components/common'];
const TOKEN_FILES = ['src/components/Sidebar.tsx', 'src/components/Header.tsx'];
// Files that must never change without a deliberate decision.
const BANNED = [
  { re: /setLogLevel\(\s*['"]silent['"]\s*\)/, msg: "setLogLevel('silent') hides permission/index errors" },
  { re: /testConnection\s*\(/, msg: 'testConnection() causes a wasted denied read on every boot' },
  { re: /\balert\(|\bwindow\.prompt\(|\bconfirm\(/, msg: 'browser dialogs (alert/prompt/confirm) are not allowed' },
];
const PALETTE = /\b(bg|text|border|from|to|via|ring|fill|stroke|divide|outline|placeholder)-(white|black|slate|gray|zinc|neutral|stone|emerald|green|red|amber|yellow|orange|sky|blue|indigo|violet|purple|pink|rose|teal|cyan|lime|fuchsia)(-\d+)?\b(?!\/)/g;
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const DARKVAR = /\bdark:[a-z-]/g;
const GRADIENT = /gradient/g;
const CAT_TEXT = /\btext-token-cat-[1-4](?!-text)\b/g;
const RGB = /\b(rgba?|hsla?)\(/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (['.ts', '.tsx', '.css'].includes(extname(p))) out.push(p);
  }
  return out;
}
const rel = (p) => p.replace(ROOT + '/', '');
const problems = [];
const add = (file, line, msg) => problems.push(`${rel(file)}:${line}  ${msg}`);

function scanTokens(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    const n = i + 1;
    for (const [re, label] of [[PALETTE, 'raw palette class'], [HEX, 'hex color'], [DARKVAR, 'dark: variant'], [GRADIENT, 'gradient'], [CAT_TEXT, 'text-token-cat-N used as text (use -text variant)'], [RGB, 'rgb()/hsl() color']]) {
      re.lastIndex = 0;
      const m = ln.match(re);
      if (m) add(file, n, `${label}: ${m[0]}`);
    }
    if (/\btext-white\b/.test(ln)) add(file, n, 'text-white (use text-token-on-accent)');
  });
}

for (const d of TOKEN_DIRS) walk(join(ROOT, d)).forEach(scanTokens);
for (const f of TOKEN_FILES) scanTokens(join(ROOT, f));

for (const file of walk(join(ROOT, 'src'))) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    for (const b of BANNED) if (b.re.test(ln)) add(file, i + 1, b.msg);
  });
}

function run(label, cmd) {
  try {
    execSync(cmd, { stdio: 'pipe', cwd: ROOT });
    console.log(`PASS  ${label}`);
  } catch (e) {
    console.log(`FAIL  ${label}`);
    console.log(String(e.stdout || '') + String(e.stderr || ''));
    problems.push(`${label} failed`);
  }
}
run('type-check (tsc --noEmit)', 'npx tsc --noEmit');
run('build (vite build)', 'npx vite build');

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  problems.slice(0, 60).forEach((p) => console.log('  - ' + p));
  if (problems.length > 60) console.log(`  ... and ${problems.length - 60} more`);
  process.exit(1);
}
console.log('\nAll checks passed.');
