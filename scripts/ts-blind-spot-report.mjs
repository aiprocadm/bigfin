#!/usr/bin/env node
/**
 * Отчёт по «слепой зоне» проверки типов витрины.
 *
 * Файлы с пометкой `// @ts-nocheck` не проверяются целиком. Скрипт временно
 * снимает пометку В ПАМЯТИ (файлы на диске не трогает), прогоняет проверку
 * типов и показывает, что именно там прячется.
 *
 *   node scripts/ts-blind-spot-report.mjs            # сводка
 *   node scripts/ts-blind-spot-report.mjs --json f   # ещё и разбор по файлам в f
 *
 * Зачем: «дешёвые» файлы (где не хватает только объявлений) выводятся из-под
 * пометки почти даром, а файлы с настоящими расхождениями типов требуют работы.
 * Отчёт отделяет одно от другого.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const WEBAPP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'webapp');
const ts = createRequire(path.join(WEBAPP, 'package.json'))('typescript');

/** Пометка «не проверять типы» — только когда она занимает строку целиком. */
const NOCHECK = /^[ \t]*\/\/[ \t]*@ts-nocheck.*\r?\n/m;
/** Виды ошибок «нет объявленного типа» — не расхождение, а отсутствие записи. */
const MISSING_ANNOTATION = new Set([7006, 7031]);
const NAMES = {
  7006: 'параметр без объявленного типа',
  7031: 'свойство разобранного объекта без объявленного типа',
  2339: 'обращение к свойству, которого нет',
  2554: 'вызов с другим числом доводов',
  2322: 'присваивание несовместимого типа',
  2739: 'не хватает обязательных свойств',
};

const parsed = ts.getParsedCommandLineOfConfigFile(path.join(WEBAPP, 'tsconfig.json'), {}, {
  ...ts.sys,
  onUnRecoverableConfigFileDiagnostic: (d) => {
    throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  },
});

const blind = new Set();
const host = ts.createCompilerHost(parsed.options, true);
const original = host.getSourceFile.bind(host);
host.getSourceFile = (fileName, langVersion, onError, shouldCreate) => {
  const file = path.normalize(fileName);
  if (file.startsWith(path.join(WEBAPP, 'src')) && fs.existsSync(file)) {
    const text = fs.readFileSync(file, 'utf8');
    if (NOCHECK.test(text)) {
      blind.add(file);
      return ts.createSourceFile(fileName, text.replace(NOCHECK, ''), langVersion, true);
    }
  }
  return original(fileName, langVersion, onError, shouldCreate);
};

const program = ts.createProgram(parsed.fileNames, parsed.options, host);
const byFile = {};
for (const d of [...program.getSemanticDiagnostics(), ...program.getSyntacticDiagnostics()]) {
  if (!d.file) continue;
  const file = path.normalize(d.file.fileName);
  if (!blind.has(file)) continue;
  (byFile[file] ??= []).push({ code: d.code, start: d.start });
}

const clean = [...blind].filter((f) => !byFile[f]);
const cheap = Object.entries(byFile).filter(([, ds]) => ds.every((d) => MISSING_ANNOTATION.has(d.code)));
const byCode = {};
for (const ds of Object.values(byFile)) for (const d of ds) byCode[d.code] = (byCode[d.code] ?? 0) + 1;

console.log(`Файлов под пометкой «не проверять типы»: ${blind.size}`);
console.log(`  из них чистых после снятия пометки:   ${clean.length}`);
console.log(`  из них не хватает только объявлений:  ${cheap.length}`);
console.log('\nОшибки по видам:');
for (const [code, n] of Object.entries(byCode).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`  TS${code}  ${String(n).padStart(5)}  ${NAMES[code] ?? ''}`);
}

const jsonAt = process.argv.indexOf('--json');
if (jsonAt !== -1 && process.argv[jsonAt + 1]) {
  fs.writeFileSync(process.argv[jsonAt + 1], JSON.stringify({ blind: [...blind], byFile }));
  console.log(`\nРазбор по файлам записан в ${process.argv[jsonAt + 1]}`);
}
