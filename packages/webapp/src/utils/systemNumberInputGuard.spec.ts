import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * З2 карты v37. Дробное число вводит поле продукта, а не поле браузера.
 *
 * Системный `<input type="number">` считает запятую разделителем разрядов
 * и молча её выбрасывает: напечатанное «1000,50» становится «100050», а
 * поле при этом считается заполненным верно. Замер в настоящем Chrome дал
 * один и тот же ответ на английском и на русском браузере — то есть дело
 * не в настройках человека, а в самом поле.
 *
 * Для целых чисел (год, число месяцев, дни, часы) запятая не нужна, и
 * системное поле остаётся уместным. Поэтому правило звучит так: у
 * системного числового поля обязан быть шаг в единицу. Всё, где бывают
 * копейки и проценты, вводится полем продукта — `MoneyField`
 * (новая раскладка) или `MoneyInputGroup` / `FMoneyInputGroup` (легаси).
 *
 * Сторож дат из карты v32 (`systemDateInputGuard`) устроен так же.
 */
const SRC = path.resolve(__dirname, '..');

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (/\.spec\.tsx?$/.test(entry.name)) return [];
    if (/\.stories\.tsx?$/.test(entry.name)) return [];
    return [full];
  });

/** Тег `<input …>` или `<Input …>` целиком, от угла до закрытия. */
const inputTags = (code: string): string[] =>
  code.match(/<[iI]nput\b[\s\S]*?\/?>/g) ?? [];

const INTEGER_STEP = /step=\{1\}|step=["']1["']/;

describe('системное числовое поле', () => {
  const files = sourceFiles(SRC);

  it('исходники витрины читаются', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(files.length).toBeGreaterThan(100);
  });

  it('дробные числа не вводятся системным полем браузера', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      const code = fs
        .readFileSync(file, 'utf8')
        .split('\n')
        // Комментарии объясняют правило и упоминают запрещённое по имени.
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n');

      inputTags(code).forEach((tag) => {
        if (!/type=["']number["']/.test(tag)) return;
        if (INTEGER_STEP.test(tag)) return;
        offenders.push(path.relative(SRC, file));
      });
    });

    expect(offenders).toEqual([]);
  });
});
