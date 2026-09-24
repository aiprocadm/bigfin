import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string) =>
      ({
        'command_palette.title': 'Поиск и команды',
        'command_palette.placeholder': 'Найти или выполнить…',
        'command_palette.searching': 'Ищу…',
        'command_palette.nothing': 'Ничего не нашлось',
      })[key] ?? key,
  },
}));

import { CommandPalette, useCommandPaletteShortcut } from './command-palette';
import type { CommandItem, CommandSource } from './command-search';

const actions = (onSelect = vi.fn()): CommandItem[] => [
  { id: 'in', group: 'Действия', title: 'Добавить приход', onSelect },
  { id: 'out', group: 'Действия', title: 'Добавить расход', onSelect },
  { id: 'bs', group: 'Перейти', title: 'Открыть баланс', onSelect },
];

describe('CommandPalette', () => {
  it('открывается с полем поиска и разделами', () => {
    render(<CommandPalette open onOpenChange={() => {}} items={actions()} />);

    expect(screen.getByRole('dialog', { name: 'Поиск и команды' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Действия' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Перейти' })).toBeInTheDocument();
  });

  it('набор сужает список, Enter выполняет выбранный пункт и закрывает окно', () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    render(<CommandPalette open onOpenChange={onOpenChange} items={actions(onSelect)} />);
    const input = screen.getByRole('combobox');

    fireEvent.change(input, { target: { value: 'расх' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('стрелки двигают выбор', () => {
    render(<CommandPalette open onOpenChange={() => {}} items={actions()} />);
    const input = screen.getByRole('combobox');

    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('записи из источника приходят после паузы; ничего — «Ничего не нашлось»', async () => {
    vi.useFakeTimers();
    const source: CommandSource = {
      id: 'contacts',
      group: 'Контрагенты',
      search: vi.fn(async (query: string) =>
        query === 'ромаш' ? [{ id: 'c1', group: 'Контрагенты', title: 'ООО «Ромашка»', onSelect: () => {} }] : [],
      ),
    };
    render(<CommandPalette open onOpenChange={() => {}} items={[]} sources={[source]} />);
    const input = screen.getByRole('combobox');

    fireEvent.change(input, { target: { value: 'ромаш' } });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    vi.useRealTimers();
    expect(await screen.findByText('ООО «Ромашка»')).toBeInTheDocument();
    expect(source.search).toHaveBeenCalledTimes(1);
  });
});

describe('useCommandPaletteShortcut', () => {
  it('Ctrl+K и ⌘K открывают', () => {
    const onOpen = vi.fn();
    const Probe = () => {
      useCommandPaletteShortcut(onOpen);
      return null;
    };
    render(<Probe />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'K', metaKey: true });
    fireEvent.keyDown(window, { key: 'k' });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });
});
