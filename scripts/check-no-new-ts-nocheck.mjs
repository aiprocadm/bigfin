#!/usr/bin/env node
// © 2026 Bigfin
//
// Блокирует ДОБАВЛЕНИЕ новых `// @ts-nocheck` (полное отключение проверки типов).
// Смотрит только на добавленные (`+`) строки диффа, поэтому ~250 уже существующих
// файлов с @ts-nocheck пропускаются автоматически — барьер ставится строго на новое.
//
// Режимы:
//   node scripts/check-no-new-ts-nocheck.mjs            — staged-дифф (для pre-commit)
//   node scripts/check-no-new-ts-nocheck.mjs --base REF — дифф REF...HEAD (для CI на PR)
//
// Выход: 0 — чисто; 1 — найдены новые @ts-nocheck; 2 — внутренняя ошибка.

import { execFileSync } from 'node:child_process';

const TS_NOCHECK = /@ts-nocheck/;

function getDiff() {
  // Аргументы передаются массивом в execFile (без оболочки) → нет шелл-инъекций.
  // Git сам раскрывает pathspec-глобы `*.ts`/`*.tsx`, поэтому шелл не нужен.
  const baseIdx = process.argv.indexOf('--base');
  const args =
    baseIdx !== -1
      ? ['diff', `${process.argv[baseIdx + 1]}...HEAD`, '-U0', '--diff-filter=ACM', '--', '*.ts', '*.tsx']
      : ['diff', '--cached', '-U0', '--diff-filter=ACM', '--', '*.ts', '*.tsx'];

  try {
    return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    console.error('check-no-new-ts-nocheck: не удалось получить git diff.');
    console.error(err.message);
    process.exit(2);
  }
}

function findOffenders(diff) {
  const offenders = [];
  let currentFile = null;
  let newLineNo = 0;

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      const m = line.match(/^\+\+\+ b\/(.*)$/);
      currentFile = m ? m[1] : null;
    } else if (line.startsWith('@@')) {
      // @@ -a,b +c,d @@  →  c = первая новая строка хунка
      const m = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      newLineNo = m ? Number(m[1]) : 0;
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      if (currentFile && TS_NOCHECK.test(line)) {
        offenders.push(`${currentFile}:${newLineNo}`);
      }
      newLineNo++;
    }
    // строки удаления ('-') и прочее не двигают счётчик новых строк
  }

  return offenders;
}

const offenders = findOffenders(getDiff());

if (offenders.length > 0) {
  console.error('\n✖ Обнаружены НОВЫЕ // @ts-nocheck — это запрещено:\n');
  for (const o of offenders) console.error('   ' + o);
  console.error(
    '\nФайл с @ts-nocheck полностью отключает проверку типов TypeScript —\n' +
      'баги в нём не ловятся. Не добавляйте новые такие файлы/строки.\n\n' +
      'Что делать:\n' +
      '  • Уберите // @ts-nocheck и типизируйте файл\n' +
      '    (точечно можно // @ts-expect-error с пояснением).\n' +
      '  • В исключительном случае осознанного легаси обойдите хук:\n' +
      '    git commit --no-verify — и поясните причину в описании PR.\n',
  );
  process.exit(1);
}

process.exit(0);
