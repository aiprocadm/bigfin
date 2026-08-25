import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Г3 карты v20. У списка два разных «пусто»:
 *
 *  - раздел пуст целиком — показывается приглашение завести первую запись;
 *  - отбор ничего не нашёл — нужно сказать «ничего не нашлось», иначе
 *    человек видит голую таблицу и решает, что продукт сломался.
 *
 * Второй случай был забыт ровно у одного списка из двадцати одного — у
 * журнала проводок. Сторож держит правило для всех сразу.
 */
const CONTAINERS = path.resolve(__dirname, '../../containers');

const tableFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return tableFiles(full);
    return /v2.*TableV2\.tsx$/.test(full) ? [full] : [];
  });

describe('списки: пустой результат отбора подписан', () => {
  const files = tableFiles(CONTAINERS);

  it('списки вообще нашлись', () => {
    // Иначе сломанный обход сделал бы проверку ниже пустой и зелёной.
    expect(files.length).toBeGreaterThan(15);
  });

  it('каждый список передаёт таблице подсказку для пустого результата', () => {
    const without = files
      .filter((file) => !fs.readFileSync(file, 'utf8').includes('emptyState'))
      .map((file) => path.relative(CONTAINERS, file));

    expect(without).toEqual([]);
  });
});
