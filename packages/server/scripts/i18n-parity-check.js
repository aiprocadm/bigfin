#!/usr/bin/env node
/**
 * Сверяет парность серверных переводов между src/i18n/en и src/i18n/ru.
 *
 * Серверный словарь (nestjs-i18n) — это набор отдельных JSON-файлов на локаль
 * (account.json, invoice.json, …) с вложенными ключами. Скрипт:
 *   - проверяет, что набор файлов в en и ru совпадает;
 *   - рекурсивно разворачивает вложенные ключи в плоские пути (a.b.c);
 *   - сверяет ключи по каждому файлу в обе стороны.
 *
 * Завершается с exit 1 при любом расхождении (для CI / pre-commit hooks).
 * Аналог webapp/scripts/lang-check.js, но для серверной локали.
 *
 * Использование: node scripts/i18n-parity-check.js
 */
const fs = require('fs');
const path = require('path');

const I18N_DIR = path.join(__dirname, '..', 'src', 'i18n');
const enDir = path.join(I18N_DIR, 'en');
const ruDir = path.join(I18N_DIR, 'ru');

for (const [label, dir] of [['en', enDir], ['ru', ruDir]]) {
  if (!fs.existsSync(dir)) {
    console.error(`ERROR: каталог локали ${label} не найден: ${dir}`);
    process.exit(2);
  }
}

/** Список .json файлов в каталоге локали (по имени). */
function listJsonFiles(dir) {
  return new Set(
    fs.readdirSync(dir).filter((f) => f.endsWith('.json')),
  );
}

/** Рекурсивно разворачивает объект перевода в множество плоских ключей a.b.c. */
function flattenKeys(obj, prefix, acc) {
  for (const [k, v] of Object.entries(obj)) {
    const keyPath = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flattenKeys(v, keyPath, acc);
    } else {
      acc.add(keyPath);
    }
  }
  return acc;
}

function loadKeys(filePath) {
  let json;
  try {
    json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`ERROR: невалидный JSON в ${filePath}: ${e.message}`);
    process.exit(2);
  }
  return flattenKeys(json, '', new Set());
}

const enFiles = listJsonFiles(enDir);
const ruFiles = listJsonFiles(ruDir);

const filesOnlyEn = [...enFiles].filter((f) => !ruFiles.has(f));
const filesOnlyRu = [...ruFiles].filter((f) => !enFiles.has(f));

let totalEn = 0;
let totalRu = 0;
let totalMissing = 0; // есть в en, нет в ru
let totalExtra = 0; // есть в ru, нет в en
const perFileReport = [];

const sharedFiles = [...enFiles].filter((f) => ruFiles.has(f)).sort();
for (const file of sharedFiles) {
  const enKeys = loadKeys(path.join(enDir, file));
  const ruKeys = loadKeys(path.join(ruDir, file));
  totalEn += enKeys.size;
  totalRu += ruKeys.size;

  const missing = [...enKeys].filter((k) => !ruKeys.has(k));
  const extra = [...ruKeys].filter((k) => !enKeys.has(k));
  totalMissing += missing.length;
  totalExtra += extra.length;

  if (missing.length || extra.length) {
    perFileReport.push({ file, missing, extra });
  }
}

console.log(`Файлов: en=${enFiles.size}, ru=${ruFiles.size}`);
console.log(`Ключей: en=${totalEn}, ru=${totalRu}`);
console.log(`Отсутствуют в ru (есть в en): ${totalMissing}`);
console.log(`Лишние в ru (нет в en): ${totalExtra}`);

if (filesOnlyEn.length) {
  console.log('\nФайлы только в en:');
  filesOnlyEn.forEach((f) => console.log(`  - ${f}`));
}
if (filesOnlyRu.length) {
  console.log('\nФайлы только в ru:');
  filesOnlyRu.forEach((f) => console.log(`  + ${f}`));
}

if (perFileReport.length) {
  console.log('\nРасхождения ключей по файлам:');
  for (const { file, missing, extra } of perFileReport) {
    console.log(`\n  ${file}:`);
    missing.slice(0, 20).forEach((k) => console.log(`    - ${k} (нет в ru)`));
    if (missing.length > 20) console.log(`    ... и ещё ${missing.length - 20}`);
    extra.slice(0, 20).forEach((k) => console.log(`    + ${k} (нет в en)`));
    if (extra.length > 20) console.log(`    ... и ещё ${extra.length - 20}`);
  }
}

const hasProblems =
  filesOnlyEn.length ||
  filesOnlyRu.length ||
  totalMissing > 0 ||
  totalExtra > 0;

if (hasProblems) {
  console.log('\n❌ FAIL: серверные переводы en↔ru расходятся. Выровняйте ключи в src/i18n/.');
  process.exit(1);
}

console.log('\n✅ OK: парность серверных переводов en↔ru соблюдена.');
