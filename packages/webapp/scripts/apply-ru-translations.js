#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const WEBAPP_DIR = path.join(__dirname, '..');
const enPath = path.join(WEBAPP_DIR, 'src', 'lang', 'en', 'index.json');
const ruPath = path.join(WEBAPP_DIR, 'src', 'lang', 'ru', 'index.json');
const translationsPath = path.join(__dirname, 'translations', 'ru.json');

function die(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(enPath)) die(`${enPath} not found`);
if (!fs.existsSync(translationsPath)) die(`${translationsPath} not found`);

let en, translations;
try { en = JSON.parse(fs.readFileSync(enPath, 'utf8')); }
catch (e) { die(`invalid JSON in ${enPath}: ${e.message}`); }
try { translations = JSON.parse(fs.readFileSync(translationsPath, 'utf8')); }
catch (e) { die(`invalid JSON in ${translationsPath}: ${e.message}`); }

const enKeys = Object.keys(en);
const result = {};
let translated = 0;
let fallback = 0;
const unknownTranslationKeys = [];

for (const key of enKeys) {
  if (Object.prototype.hasOwnProperty.call(translations, key)) {
    result[key] = translations[key];
    translated++;
  } else {
    result[key] = en[key];
    fallback++;
  }
}

for (const tKey of Object.keys(translations)) {
  if (tKey.startsWith('_')) continue;
  if (!Object.prototype.hasOwnProperty.call(en, tKey)) {
    unknownTranslationKeys.push(tKey);
  }
}

const output = JSON.stringify(result, null, 2) + '\n';
fs.writeFileSync(ruPath, output, 'utf8');

const verify = JSON.parse(fs.readFileSync(ruPath, 'utf8'));
const verifySize = Object.keys(verify).length;
const verifyCyrillic = Object.values(verify).filter(
  (v) => typeof v === 'string' && /[Ѐ-ӿ]/.test(v),
).length;

console.log(`✅ Wrote ${ruPath}`);
console.log(`   Keys total: ${verifySize} (en has ${enKeys.length})`);
console.log(`   Translated (from ru.json): ${translated}`);
console.log(`   Fallback to English (no ru translation yet): ${fallback}`);
console.log(`   Values containing Cyrillic: ${verifyCyrillic}`);

if (unknownTranslationKeys.length > 0) {
  console.warn(`\n⚠️  ${unknownTranslationKeys.length} translation keys not present in en/index.json:`);
  unknownTranslationKeys.slice(0, 10).forEach((k) => console.warn(`     - ${k}`));
  if (unknownTranslationKeys.length > 10) console.warn(`     ... and ${unknownTranslationKeys.length - 10} more`);
}

if (verifySize !== enKeys.length) {
  die(`size mismatch: ru has ${verifySize}, en has ${enKeys.length}`);
}

console.log('\n✅ Sanity verification passed.');
