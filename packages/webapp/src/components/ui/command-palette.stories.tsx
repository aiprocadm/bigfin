import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import { CommandPalette, useCommandPaletteShortcut } from './command-palette';
import type { CommandItem, CommandSource } from './command-search';

/**
 * Командная строка: действия, переходы и записи из источников. ⌘K / Ctrl+K.
 */
const meta = {
  title: 'UI/CommandPalette',
  component: CommandPalette,
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

const ITEMS: CommandItem[] = [
  { id: 'in', group: 'Действия', title: 'Добавить приход', keywords: ['деньги пришли'], onSelect: () => {} },
  { id: 'out', group: 'Действия', title: 'Добавить расход', keywords: ['деньги ушли'], onSelect: () => {} },
  { id: 'invoice', group: 'Действия', title: 'Новый счёт покупателю', onSelect: () => {} },
  { id: 'bs', group: 'Перейти', title: 'Открыть баланс', onSelect: () => {} },
  { id: 'pnl', group: 'Перейти', title: 'Открыть прибыль (ОПиУ)', onSelect: () => {} },
];

const CONTACTS: CommandSource = {
  id: 'contacts',
  group: 'Контрагенты',
  search: async (query) =>
    ['ООО «Ромашка»', 'ИП Петров', 'ООО «Настоящее»']
      .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
      .map((name) => ({ id: name, group: 'Контрагенты', title: name, subtitle: 'клиент', onSelect: () => {} })),
};

const Live = () => {
  const [open, setOpen] = React.useState(true);
  useCommandPaletteShortcut(React.useCallback(() => setOpen(true), []));
  return (
    <div className="bigfin-ui p-4">
      <Button onClick={() => setOpen(true)}>Поиск и команды (⌘K)</Button>
      <CommandPalette open={open} onOpenChange={setOpen} items={ITEMS} sources={[CONTACTS]} />
    </div>
  );
};

export const Default: Story = {
  args: { open: true, onOpenChange: () => {}, items: ITEMS },
  render: () => <Live />,
};
