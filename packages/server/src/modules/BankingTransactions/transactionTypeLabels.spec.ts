// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { TransactionTypes } from './constants';
import { getTransactionTypeLabel } from './utils';

/**
 * М3 срез 3 (карта v15). Живая проба показала, что Главная книга и Журнал
 * отвечают 500 на любом периоде с проводками. Причина: у типа операции нет
 * названия в справочнике, `getTransactionTypeLabel` возвращает `null`, а
 * перевод по пустому ключу роняет весь отчёт.
 *
 * Так «умерли» дивиденды, займы, амортизация и перемещение по складам:
 * модули дописали, а названия завести забыли.
 */
const SERVER_SRC = path.resolve(__dirname, '../..');
const RU_LABELS = path.join(SERVER_SRC, 'i18n/ru/transaction_type.json');
const EN_LABELS = path.join(SERVER_SRC, 'i18n/en/transaction_type.json');

/** Собирает файлы .ts рекурсивно, пропуская тесты. */
const collectSources = (dir: string): string[] => {
  const out: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...collectSources(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.includes('.spec.')) {
      out.push(full);
    }
  }
  return out;
};

/**
 * Все типы операций, которые код кладёт в проводки: и записанные строкой
 * прямо в объекте, и объявленные отдельной константой.
 */
const usedTransactionTypes = (): string[] => {
  const found = new Set<string>();

  for (const file of collectSources(path.join(SERVER_SRC, 'modules'))) {
    const source = fs.readFileSync(file, 'utf8');

    for (const m of source.matchAll(/transactionType:\s*'([A-Za-z]+)'/g)) {
      found.add(m[1]);
    }
    for (const m of source.matchAll(
      /_TRANSACTION_TYPE\s*=\s*'([A-Za-z]+)'/g,
    )) {
      found.add(m[1]);
    }
  }
  return Array.from(found).sort();
};

describe('названия типов операций', () => {
  const types = usedTransactionTypes();

  it('типы операций вообще нашлись', () => {
    // Иначе пустой список сделал бы проверки ниже бессмысленно зелёными.
    expect(types.length).toBeGreaterThan(15);
  });

  it('у каждого типа операции есть название', () => {
    const nameless = types.filter((type) => !TransactionTypes[type]);

    expect(nameless).toEqual([]);
  });

  it('название переведено на русский и английский', () => {
    const ru = JSON.parse(fs.readFileSync(RU_LABELS, 'utf8'));
    const en = JSON.parse(fs.readFileSync(EN_LABELS, 'utf8'));

    const untranslated = types
      .map((type) => TransactionTypes[type])
      .filter((key) => typeof key === 'string')
      .map((key: string) => key.replace('transaction_type.', ''))
      .filter((key) => !(key in ru) || !(key in en));

    expect(untranslated).toEqual([]);
  });

  it('неизвестный тип не превращается в пустоту', () => {
    // Завтра появится новый модуль — отчёт не должен из-за этого падать.
    expect(getTransactionTypeLabel('SomethingBrandNew')).toBeTruthy();
  });
});
