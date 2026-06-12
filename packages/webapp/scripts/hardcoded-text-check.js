#!/usr/bin/env node
/**
 * Сканер-сторож: ищет английский текст, зашитый в JSX мимо словаря переводов.
 *
 * Что ищет (эвристики, построчно):
 *   1. Текстовые узлы JSX:        >Save changes<
 *   2. Строковые атрибуты:        placeholder="Select account", title={'Delete'}
 *   3. Текстовые свойства:        message: 'Something went wrong' (toast/alert/dialog)
 *
 * Белый список — scripts/hardcoded-text-whitelist.json:
 *   strings  — точные строки, разрешённые латиницей (брендинг: "Email", "PRO", ...)
 *   patterns — регулярки для разрешённых значений (форматы дат и т.п.)
 *   files    — фрагменты путей, исключённые из проверки целиком
 * Пополняется осознанно, отдельным диффом.
 *
 * Завершается с exit 1, если есть находки вне белого списка (критерий
 * готовности этапа 1 русификации — ноль находок).
 *
 * Использование: node scripts/hardcoded-text-check.js [--json]
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const WHITELIST_PATH = path.join(__dirname, 'hardcoded-text-whitelist.json');

const SCAN_EXTENSIONS = ['.tsx', '.jsx'];
const SKIP_FILE_SUFFIXES = ['.spec.tsx', '.test.tsx', '.stories.tsx', '.d.ts'];
const SKIP_DIR_NAMES = new Set(['__tests__', '__mocks__', 'lang']);

let whitelist = { strings: [], patterns: [], files: [] };
if (fs.existsSync(WHITELIST_PATH)) {
  try {
    whitelist = Object.assign(whitelist, JSON.parse(fs.readFileSync(WHITELIST_PATH, 'utf8')));
  } catch (e) {
    console.error(`ERROR: invalid JSON in ${WHITELIST_PATH}: ${e.message}`);
    process.exit(2);
  }
}
const allowedStrings = new Set(whitelist.strings);
const allowedPatterns = whitelist.patterns.map((p) => new RegExp(p));
const allowedFiles = whitelist.files;

/** Атрибуты JSX, значения которых видит пользователь. */
const ATTR_RE =
  /(?:placeholder|title|label|aria-label|alt|tooltip|helperText|description|emptyStateText|buttonText|confirmButtonText|cancelButtonText)\s*=\s*(?:["']([^"']+)["']|\{\s*['"]([^'"]+)['"]\s*\})/g;

/** Текстовые свойства объектов (toast/alert/dialog). */
const PROP_RE =
  /\b(?:message|heading|confirmLabel|cancelLabel|successMessage|errorMessage)\s*:\s*['"]([^'"]+)['"]/g;

/**
 * Текстовый узел JSX на одной строке: >Текст</ перед закрывающим тегом.
 * Требование "</" отсекает TypeScript-дженерики (Promise<void> и т.п.).
 */
const JSX_TEXT_RE = />([^<>{}\n]+)<\//g;

/**
 * Похоже ли значение на английский текст для пользователя.
 * Принимаем: начинается с заглавной латинской буквы ИЛИ содержит 2+ латинских
 * слова подряд. Отбрасываем технические значения: идентификаторы, пути,
 * camelCase, выражения, строки с кириллицей (уже переведены).
 */
function looksLikeEnglishText(raw) {
  const value = raw.trim();
  if (!value) return false;
  if (/[Ѐ-ӿ]/.test(value)) return false; // кириллица — уже переведено
  if (!/[A-Za-z]{2,}/.test(value)) return false; // нет латинских слов
  if (/[{}$<>]/.test(value)) return false; // выражение/разметка
  // Технический одиночный токен: camelCase, kebab-case, snake_case, путь, MIME
  if (!/\s/.test(value)) {
    if (/^[a-z]/.test(value) || /[-_./:@#]/.test(value)) return false;
  }
  const startsCapital = /^[^A-Za-z]*[A-Z][a-z]/.test(value);
  const twoWords = /[A-Za-z]{2,}[\s,][\s]*[A-Za-z]{2,}/.test(value);
  const upperWord = /^[A-Z]{2,}$/.test(value); // "TOTAL", "PRO"
  return startsCapital || twoWords || upperWord;
}

function isWhitelisted(value, relPath) {
  const trimmed = value.trim();
  if (allowedStrings.has(trimmed)) return true;
  if (allowedPatterns.some((re) => re.test(trimmed))) return true;
  if (allowedFiles.some((f) => relPath.includes(f))) return true;
  return false;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIR_NAMES.has(entry.name)) walk(path.join(dir, entry.name), files);
    } else if (
      SCAN_EXTENSIONS.includes(path.extname(entry.name)) &&
      !SKIP_FILE_SUFFIXES.some((s) => entry.name.endsWith(s))
    ) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

const DETECTORS = [
  ['attr', ATTR_RE],
  ['prop', PROP_RE],
  ['jsx-text', JSX_TEXT_RE],
];

const findings = [];
for (const file of walk(SRC_DIR)) {
  const relPath = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
  if (allowedFiles.some((f) => relPath.includes(f))) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const [detector, re] of DETECTORS) {
      for (const m of line.matchAll(re)) {
        const value = (m[1] ?? m[2] ?? '').trim();
        if (!value || !looksLikeEnglishText(value)) continue;
        if (isWhitelisted(value, relPath)) continue;
        findings.push({ file: relPath, line: i + 1, detector, value });
      }
    }
  });
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(findings, null, 2));
} else {
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const [file, list] of [...byFile.entries()].sort()) {
    console.log(`\n${file} (${list.length}):`);
    for (const f of list) console.log(`  ${f.line} [${f.detector}] "${f.value}"`);
  }
  console.log(`\nФайлов с находками: ${byFile.size}, всего находок: ${findings.length}`);
}

if (findings.length > 0) {
  if (!process.argv.includes('--json')) {
    console.log(
      '\n❌ FAIL: найден английский текст мимо словаря. Переведите через intl.get(...) или пополните белый список (scripts/hardcoded-text-whitelist.json).'
    );
  }
  process.exit(1);
}
console.log('✅ OK: захардкоженный английский текст не найден.');
