#!/usr/bin/env node
/**
 * Сравнивает ключи между lang/en/index.json и lang/ru/index.json.
 *
 * Выводит:
 *   - количество ключей в каждом языке
 *   - missing keys (есть в en, нет в ru)
 *   - extra keys (есть в ru, нет в en)
 *
 * Завершается с exit 1 если есть missing keys (для CI / pre-commit hooks).
 *
 * Использование: node scripts/lang-check.js
 * Или через pnpm: pnpm run lang:check
 */
const fs = require('fs');
const path = require('path');

const LANG_DIR = path.join(__dirname, '..', 'src', 'lang');
const enPath = path.join(LANG_DIR, 'en', 'index.json');
const ruPath = path.join(LANG_DIR, 'ru', 'index.json');

if (!fs.existsSync(enPath)) {
  console.error(`ERROR: ${enPath} not found`);
  process.exit(2);
}
if (!fs.existsSync(ruPath)) {
  console.error(`ERROR: ${ruPath} not found. Run "create lang/ru/index.json" first.`);
  process.exit(2);
}

let en, ru;
try {
  en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
} catch (e) {
  console.error(`ERROR: invalid JSON in ${enPath}: ${e.message}`);
  process.exit(2);
}
try {
  ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));
} catch (e) {
  console.error(`ERROR: invalid JSON in ${ruPath}: ${e.message}`);
  process.exit(2);
}

const enKeys = new Set(Object.keys(en));
const ruKeys = new Set(Object.keys(ru));

const missing = [...enKeys].filter((k) => !ruKeys.has(k));
const extra = [...ruKeys].filter((k) => !enKeys.has(k));

console.log(`English keys: ${enKeys.size}`);
console.log(`Russian keys: ${ruKeys.size}`);
console.log(`Missing in ru (есть в en, нет в ru): ${missing.length}`);
console.log(`Extra in ru (есть в ru, нет в en): ${extra.length}`);

if (missing.length > 0) {
  console.log('\nMissing keys (показано до 20):');
  missing.slice(0, 20).forEach((k) => console.log(`  - ${k}`));
  if (missing.length > 20) {
    console.log(`  ... и ещё ${missing.length - 20} ключей`);
  }
}
if (extra.length > 0) {
  console.log('\nExtra keys (показано до 20):');
  extra.slice(0, 20).forEach((k) => console.log(`  + ${k}`));
  if (extra.length > 20) {
    console.log(`  ... и ещё ${extra.length - 20} ключей`);
  }
}

if (missing.length > 0) {
  console.log('\n❌ FAIL: есть ключи без перевода. Добавьте их в lang/ru/index.json.');
  process.exit(1);
}

console.log('\n✅ OK: парность ключей en↔ru соблюдена.');
