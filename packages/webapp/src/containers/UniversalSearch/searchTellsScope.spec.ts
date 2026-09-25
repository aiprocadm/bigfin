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
 * Правило: подпись поиска берётся из словаря и обещает ровно то, что поиск
 * делает; пустой ответ говорит то же самое.
 *
 * Этап 45 ТЗ-4 (UI-045-4): поле в шапке открывает командную строку, а она
 * ищет по ВСЕМ видам записей старого поиска сразу. Подпись «Поиск и
 * команды» стала правдой — и сторож проверяет, что обещание держится:
 * командная строка и правда спрашивает все виды.
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

  it('подпись в шапке — из словаря, и обещание «везде» выполняется', () => {
    const palette = read('components/Dashboard/ConnectedCommandPalette.tsx');

    expect(topbar).toContain('topbar.search_commands');
    expect(topbar).not.toMatch(/placeholder="[^"]*[А-Яа-я]/);
    // «Поиск и команды» обещает искать по всем видам — значит командная
    // строка обязана спрашивать все виды старого поиска, а не один.
    expect(palette).toContain('getUniversalSearchBinds()');
    expect(palette).not.toContain('defaultResourceType');
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
