import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Э2 карты v31. Пустой экран объясняет свой раздел.
 *
 * Разделы, добавленные позже остальных, встречают человека одной фразой:
 * «Заявок нет», «Долгов нет», «Сделок пока нет». Продукт же для себя
 * установил другой стандарт (карта v24) — заголовок с приглашением и
 * объяснение, зачем раздел нужен:
 *
 *   «Уменьшайте баланс поставщиков созданием возврата.
 *    Возврат поставщику — это документ, который отправляется поставщику
 *    и фиксирует, что он должен вашей организации…»
 *
 * Разница не косметическая: продукт нацелен на предпринимателя БЕЗ
 * бухгалтерского образования, и «Долгов нет» не объясняет ни зачем
 * раздел, ни что тут можно сделать.
 */
const SRC = path.resolve(__dirname, '..');

/** Раздел → файл, который рисует его пустой экран. */
const SECTIONS = [
  { key: 'debts', file: 'containers/Debts/DebtsPage.tsx' },
  { key: 'payment_requests', file: 'containers/PaymentRequests/PaymentRequestsPage.tsx' },
  { key: 'credits', file: 'containers/Credits/CreditsPage.tsx' },
  { key: 'fixed_assets', file: 'containers/FixedAssets/FixedAssetsPage.tsx' },
  { key: 'deals', file: 'containers/Deals/DealsPage.tsx' },
  { key: 'cost_allocation', file: 'containers/CostAllocation/CostAllocationPage.tsx' },
  { key: 'dividends', file: 'containers/Dividends/DividendsPage.tsx' },
];

const dictionary = (lang: string) =>
  JSON.parse(
    fs.readFileSync(path.join(SRC, `lang/${lang}/index.json`), 'utf8'),
  ) as Record<string, string>;

describe('пустые экраны новых разделов', () => {
  const ru = dictionary('ru');
  const en = dictionary('en');

  it('разделы перечислены', () => {
    // Иначе проверки ниже стали бы пустыми и зелёными.
    expect(SECTIONS.length).toBeGreaterThanOrEqual(7);
  });

  it('у каждого раздела есть заголовок и объяснение в обоих словарях', () => {
    const missing: string[] = [];

    SECTIONS.forEach(({ key }) => {
      ['title', 'description'].forEach((part) => {
        const dictionaryKey = `${key}.empty_status.${part}`;
        if (!ru[dictionaryKey] || !en[dictionaryKey]) missing.push(dictionaryKey);
      });
    });

    expect(missing).toEqual([]);
  });

  it('объяснение длиннее заголовка — это объяснение, а не вторая подпись', () => {
    const tooShort = SECTIONS.filter(({ key }) => {
      const description = ru[`${key}.empty_status.description`] ?? '';
      return description.length < 60;
    }).map(({ key }) => key);

    expect(tooShort).toEqual([]);
  });

  it('раздел рисует общий EmptyState, а не голую строку', () => {
    const offenders: string[] = [];

    SECTIONS.forEach(({ key, file }) => {
      const source = fs.readFileSync(path.join(SRC, file), 'utf8');

      if (!source.includes('EmptyState')) {
        offenders.push(`${file}: нет EmptyState`);
        return;
      }
      if (!source.includes(`${key}.empty_status.title`)) {
        offenders.push(`${file}: не показывает заголовок раздела`);
      }
    });

    expect(offenders).toEqual([]);
  });
});
