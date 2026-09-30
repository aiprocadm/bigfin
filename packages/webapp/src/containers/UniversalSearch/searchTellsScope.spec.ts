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
  // Старое окно `UniversalSearch` удалено в этапе 46 по решению владельца:
  // с этапа 45 его место заняла командная строка, и открыть окно было
  // нечем. Пустой ответ командной строки — «Ничего не нашлось» по всем
  // видам сразу, и это правда.
  const palette = read('components/ui/command-palette.tsx');

  it('исходники читаются', () => {
    expect(topbar).toContain('searchSlot');
    expect(palette).toContain('command_palette.nothing');
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

  it('оба текста есть в обоих словарях', () => {
    const ru = JSON.parse(read('lang/ru/index.json'));
    const en = JSON.parse(read('lang/en/index.json'));

    ['topbar.search_commands', 'command_palette.nothing'].forEach((key) => {
      expect(ru[key]).toBeTruthy();
      expect(en[key]).toBeTruthy();
    });
  });
});
