// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

import { activeCode } from '../../testing/activeCode';

/**
 * Сторож: список отдаёт всё, что форма умеет изменить.
 *
 * ЗАЧЕМ. Форма правки шлёт на сервер ВСЕ свои поля разом. Поле, которого
 * список не вернул, форме нечем заполнить — она отправляет пустое, и сервер
 * честно затирает настоящее значение.
 *
 * Так и было: справочник отдавал 9 полей из 17. Человек открывал юрлицо,
 * правил название, сохранял — и терял КПП, ОГРН, директора и адрес. Ни одна
 * проверка этого не видела: запрос успешен, ответ 200, данных просто нет.
 *
 * Это не частный случай справочника юрлиц, а целый вид поломок: «форма
 * возвращает меньше, чем получила».
 */
const ROOT = __dirname;

const read = (file: string) =>
  activeCode(fs.readFileSync(path.join(ROOT, file), 'utf-8'));

/** Поля, которые принимает DTO правки. */
function dtoFields(): string[] {
  const source = read('dtos/LegalEntity.dto.ts');
  // Общий предок создания и правки: `CreateLegalEntityDto` и
  // `EditLegalEntityDto` — тонкие наследники без своих полей.
  const start = source.indexOf('class CommandLegalEntityDto');

  if (start < 0) throw new Error('не нашёл DTO юрлица');

  // До следующего класса: дальше идут другие DTO этого же файла.
  const end = source.indexOf('class ', start + 10);
  const block = end > 0 ? source.slice(start, end) : source.slice(start);

  // `  name: string;` / `  vatPayer?: boolean;`
  const re = /^\s{2}(\w+)\??:\s/gm;
  const names: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = re.exec(block)) !== null) names.push(match[1]);

  return [...new Set(names)];
}

/** Поля, которые отдаёт строка списка. */
function rowFields(): string[] {
  const source = read('LegalEntities.application.ts');
  const start = source.indexOf('export interface LegalEntityRow');
  const end = source.indexOf('}', start);
  const block = source.slice(start, end);

  const re = /^\s{2}(\w+)\??:\s/gm;
  const names: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = re.exec(block)) !== null) names.push(match[1]);

  return [...new Set(names)];
}

describe('справочник юрлиц отдаёт всё, что форма изменяет', () => {
  const dto = dtoFields();
  const row = rowFields();

  it('поля DTO и правда прочитаны', () => {
    // Иначе сравнение ниже стало бы пустым и зелёным.
    expect(dto.length).toBeGreaterThan(10);
    expect(dto).toContain('name');
    expect(dto).toContain('bankDetails');
  });

  it('поля строки списка и правда прочитаны', () => {
    expect(row.length).toBeGreaterThan(10);
    expect(row).toContain('accountsCount');
  });

  it('ни одно изменяемое поле не потеряно', () => {
    const missing = dto.filter((field) => !row.includes(field));

    expect(missing).toEqual([]);
  });

  it('банковские реквизиты разбираются из строки', () => {
    // MySQL отдаёт колонку JSON то объектом, то строкой. Форма, получившая
    // строку, покажет пустые поля банка и затрёт их при сохранении.
    const source = read('LegalEntities.application.ts');

    expect(source).toContain('parseBankDetails');
    expect(source).toContain('JSON.parse');
  });
});
