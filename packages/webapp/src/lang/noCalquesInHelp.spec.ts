// © 2026 Bigfin
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * В справке нет калек с английского (FIN-025 ТЗ-2, приёмка 5).
 *
 * ЗАЧЕМ ИМЕННО ЗДЕСЬ. Справка — последнее место, где можно позволить себе
 * чужое слово. Человек открыл её ПОТОМУ, что не понял экрана: встретив там
 * «дрилдаун транзакций», он закроет её и больше не откроет. Объяснение,
 * написанное на том же языке, что и непонятное место, ничего не объясняет.
 *
 * Список взят из ТЗ дословно и дополнен соседями по смыслу. Он и есть
 * правило: слово из списка — это всегда признак того, что фразу писали с
 * английского, а не по-русски.
 */
const RU = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'ru', 'index.json'), 'utf8'),
) as Record<string, unknown>;

/** Кальки и их русские замены — подсказка тому, кто чинит спеку. */
const CALQUES: Array<[string, string]> = [
  ['транзакц', 'операция'],
  ['инвойс', 'счёт'],
  ['репорт', 'отчёт'],
  ['дрилдаун', 'раскрытие'],
  ['кэшфлоу', 'движение денег'],
  ['кеш-флоу', 'движение денег'],
  ['аккаунтинг', 'учёт'],
  ['экспенс', 'расход'],
  ['ревенью', 'выручка'],
  ['вендор', 'поставщик'],
  ['кастомер', 'клиент'],
  ['бэлэнс', 'остаток'],
  ['профит', 'прибыль'],
];

const helpEntries = Object.entries(RU).filter(
  ([key, value]) =>
    key.startsWith('screen_help.') && typeof value === 'string',
);

describe('справка написана по-русски', () => {
  it('тексты справки прочитаны', () => {
    // Без этой проверки пустой разбор сделал бы сторож зелёным «бесплатно».
    expect(helpEntries.length).toBeGreaterThan(50);
  });

  it('ни одной кальки', () => {
    const offenders = helpEntries
      .flatMap(([key, value]) =>
        CALQUES.filter(([calque]) =>
          String(value).toLowerCase().includes(calque),
        ).map(([calque, replacement]) => `${key}: «${calque}» → «${replacement}»`),
      )
      .sort();

    expect(offenders).toEqual([]);
  });

  it('проверка ловит подделку', () => {
    // Мутация: сторож, который ничего не ловит, хуже отсутствующего.
    const fake = 'Здесь видны все транзакции по счёту.';

    expect(
      CALQUES.some(([calque]) => fake.toLowerCase().includes(calque)),
    ).toBe(true);
  });
});
