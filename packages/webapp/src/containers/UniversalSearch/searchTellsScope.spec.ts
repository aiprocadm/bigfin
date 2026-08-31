import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { activeCode } from '../../testing/activeCode';

/**
 * С3 карты v39. Поиск не обещает того, чего не делает.
 *
 * В шапке было зашито строкой «Поиск по контрагентам, счетам…» — обещание
 * искать везде. Поиск же смотрит один вид записей за раз, и на экране
 * счетов запрос с именем клиента возвращал «Ничего не найдено».
 *
 * Правило: подпись поиска берётся из словаря и называет тот вид записей,
 * среди которого поиск и правда будет искать; пустой ответ говорит то же
 * самое.
 */
const SRC = path.resolve(__dirname, '../..');

const read = (relative: string): string =>
  activeCode(fs.readFileSync(path.join(SRC, relative), 'utf8'));

describe('подпись поиска', () => {
  const topbar = read('components/Dashboard/ConnectedTopbar.tsx');
  const dialog = read('components/UniversalSearch/UniversalSearch.tsx');

  it('исходники читаются', () => {
    expect(topbar).toContain('searchSlot');
    expect(dialog).toContain('noResults');
  });

  it('подпись в шапке называет вид записей, а не обещает «везде»', () => {
    expect(topbar).toContain('universal_search.placeholder_in');
    expect(topbar).not.toMatch(/placeholder="[^"]*[А-Яа-я]/);
  });

  it('пустой ответ говорит, среди чего искали', () => {
    expect(dialog).toContain('universal_search.no_results_in');
    expect(dialog).toContain('universal_search.switch_type_hint');
  });

  it('оба текста есть в обоих словарях', () => {
    const ru = JSON.parse(read('lang/ru/index.json'));
    const en = JSON.parse(read('lang/en/index.json'));

    [
      'universal_search.placeholder_in',
      'universal_search.no_results_in',
      'universal_search.switch_type_hint',
    ].forEach((key) => {
      expect(ru[key]).toBeTruthy();
      expect(en[key]).toBeTruthy();
    });
  });
});
