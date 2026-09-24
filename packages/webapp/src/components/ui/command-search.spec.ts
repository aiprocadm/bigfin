import { describe, expect, it } from 'vitest';

import { type CommandItem, filterCommands, groupCommands, scoreCommand } from './command-search';

const item = (title: string, extra: Partial<CommandItem> = {}): CommandItem => ({
  id: title,
  group: 'Действия',
  title,
  onSelect: () => {},
  ...extra,
});

describe('поиск в командной строке', () => {
  it('регистр и «ё» не важны', () => {
    expect(scoreCommand(item('Счёт покупателю'), 'СЧЕТ')).toBeGreaterThan(0);
  });

  it('все слова запроса должны найтись', () => {
    expect(scoreCommand(item('Добавить приход'), 'добав прих')).toBeGreaterThan(0);
    expect(scoreCommand(item('Добавить приход'), 'добав расх')).toBe(0);
  });

  it('ищет и по ключевым словам', () => {
    expect(scoreCommand(item('Добавить приход', { keywords: ['деньги пришли'] }), 'пришли')).toBeGreaterThan(0);
  });

  it('начало названия — выше, чем середина', () => {
    const found = filterCommands(
      [item('Открыть баланс'), item('Баланс организации'), item('Сверка остатка баланса')],
      'баланс',
    ).map((entry) => entry.title);

    expect(found[0]).toBe('Баланс организации');
    expect(found).toHaveLength(3);
  });

  it('пустой запрос — всё в прежнем порядке', () => {
    const items = [item('Б'), item('А')];
    expect(filterCommands(items, '')).toEqual(items);
  });

  it('разделы — в порядке первого появления', () => {
    const grouped = groupCommands([
      item('Приход'),
      item('Ромашка', { group: 'Контрагенты' }),
      item('Расход'),
    ]);
    expect(grouped.map((g) => [g.group, g.items.length])).toEqual([
      ['Действия', 2],
      ['Контрагенты', 1],
    ]);
  });
});
