// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

import { activeCode } from '../../testing/activeCode';

/**
 * Сторож: описание ответа знает всё, что сервер и правда отдаёт.
 *
 * ЗАЧЕМ. Описание ответа — не документация «для красоты». Из него собирается
 * библиотека типов для витрины и внешних интеграций. Поле, которого в описании
 * нет, для них НЕ СУЩЕСТВУЕТ: тот, кто его читает, делает это в обход
 * договора, и однажды поле исчезает — молча, потому что никто не обещал его
 * хранить.
 *
 * Так уже терялся номер чека. Здесь же нашлось 14 полей счёта, которые сервер
 * отдавал, не объявляя.
 */
const ROOT = __dirname;

const read = (file: string) =>
  activeCode(fs.readFileSync(path.join(ROOT, file), 'utf-8'));

/** Поля, которые преобразователь добавляет в ответ. */
function exposedAttributes(): string[] {
  const source = read('queries/SaleInvoice.transformer.ts');
  const at = source.indexOf('includeAttributes');

  if (at < 0) throw new Error('не нашёл includeAttributes');

  const block = source.slice(at, source.indexOf('];', at) + 2);

  return [...new Set([...block.matchAll(/'(\w+)'/g)].map((m) => m[1]))];
}

/** Поля, объявленные в описании ответа. */
function declaredProperties(): string[] {
  const source = read('dtos/SaleInvoiceResponse.dto.ts');

  return [
    ...new Set([...source.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1])),
  ];
}

describe('описание ответа по счёту не отстаёт от кода', () => {
  const exposed = exposedAttributes();
  const declared = declaredProperties();

  it('оба списка и правда прочитаны', () => {
    // Иначе сравнение ниже стало бы пустым и зелёным.
    expect(exposed.length).toBeGreaterThan(10);
    expect(declared.length).toBeGreaterThan(20);
  });

  it('каждое отдаваемое поле объявлено', () => {
    const missing = exposed.filter((name) => !declared.includes(name));

    expect(missing).toEqual([]);
  });

  it('проверка отличает объявленное от неизвестного', () => {
    // Без этого сторож мог бы «проходить», ничего не находя.
    expect(declared).toContain('totalFormatted');
    expect(declared).not.toContain('такогоПоляНет');
  });
});
