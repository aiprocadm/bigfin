import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Переведённый экран не возвращается к старой библиотеке (§5.1 ТЗ, Д1).
 *
 * ПРАВИЛО ТЗ: «Смешение систем внутри одного экрана — запрещено. Между
 * экранами — временно допустимо.» То есть переведённый экран обязан остаться
 * переведённым, а не обрасти старыми деталями по одной.
 *
 * КАК СЧИТАТЬ ЧЕСТНО. «В файле есть @blueprintjs» — плохая мерка. `Intent` и
 * `Position` ничего не рисуют: это перечисления для всплывающих сообщений.
 * Замер по ним давал 49 «непереведённых» файлов там, где рисующих было 20.
 *
 * ЧЕГО СТОРОЖ НЕ ТРЕБУЕТ. Перевода ФОРМ. Поля форм (`FInputGroup`,
 * `FFormGroup`) объявлены в `BlueprintFormik.tsx` — они сами и есть старая
 * библиотека. Убрать из формы `ControlGroup` и `Divider`, оставив поля,
 * значило бы покрасить замер в зелёный, не изменив на экране ничего. Форма
 * переводится вместе с полями — это отдельная работа, и она в долге форм.
 */
const ROOT = __dirname;

/** Ввозы, которые НИЧЕГО НЕ РИСУЮТ. */
const INVISIBLE = new Set([
  'Intent',
  'Position',
  'Classes',
  'Alignment',
  'Boundary',
  'PopoverInteractionKind',
  'Toaster',
  'IconNames',
  'MenuDivider',
]);

/** Экраны, объявленные переведёнными. */
const MIGRATED = [
  'PaymentCalendar',
  'Budgets',
  'Deals',
  'Directions',
  'LegalEntities',
];

const IMPORT =
  /import\s*\{([^}]*)\}\s*from\s*'@blueprintjs\/[^']*'/gs;

/** Что файл РИСУЕТ старой библиотекой. */
function drawnWithLegacy(source: string): string[] {
  const used = new Set<string>();

  for (const match of source.matchAll(IMPORT)) {
    match[1].split(',').forEach((piece) => {
      const name = piece.trim().split(' as ')[0].trim();
      if (name && !INVISIBLE.has(name)) used.add(name);
    });
  }

  return [...used];
}

function screensFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;

  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) return screensFiles(full, acc);
    if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.spec.tsx')) {
      acc.push(full);
    }
  });

  return acc;
}

describe('переведённые экраны остаются переведёнными', () => {
  MIGRATED.forEach((screen) => {
    it(`${screen}: ничего не рисует старой библиотекой`, () => {
      const offenders = screensFiles(path.join(ROOT, screen))
        .map((file) => ({
          file: path.relative(ROOT, file),
          used: drawnWithLegacy(fs.readFileSync(file, 'utf8')),
        }))
        .filter((row) => row.used.length > 0)
        .map((row) => `${row.file}: ${row.used.join(', ')}`);

      expect(offenders).toEqual([]);
    });
  });

  it('экраны вообще нашлись', () => {
    // Иначе спека молча позеленеет на несуществующих папках.
    MIGRATED.forEach((screen) => {
      expect(screensFiles(path.join(ROOT, screen)).length, screen).toBeGreaterThan(0);
    });
  });

  it('перечисления не считаются рисующими', () => {
    // Мерка «в файле есть @blueprintjs» давала 49 «непереведённых» файлов
    // там, где рисующих было 20.
    expect(
      drawnWithLegacy("import { Intent } from '@blueprintjs/core';"),
    ).toEqual([]);
    expect(
      drawnWithLegacy("import { Button } from '@blueprintjs/core';"),
    ).toEqual(['Button']);
  });

  it('переименованный ввоз не прячется', () => {
    // `Icon as BlueprintIcon` — так написано в форме контрагента. Проверка
    // по имени после `as` пропустила бы его.
    expect(
      drawnWithLegacy("import { Icon as BlueprintIcon } from '@blueprintjs/core';"),
    ).toEqual(['Icon']);
  });
});
