import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ListToolbar } from './list-toolbar';
import { Button } from './button';

const meta: Meta<typeof ListToolbar> = {
  title: 'UI/ListToolbar',
  component: ListToolbar,
  decorators: [
    (Story) => (
      <div className="bigfin-ui light bg-background p-8">
        <Story />
      </div>
    ),
  ],
};
export default meta;

export const Search: StoryObj<typeof ListToolbar> = {
  render: () => {
    const [s, setS] = React.useState('');
    return <ListToolbar search={s} onSearchChange={setS} searchPlaceholder="Поиск…" />;
  },
};

export const WithSelection: StoryObj<typeof ListToolbar> = {
  args: {
    selectedCount: 3,
    bulkActions: (
      <Button variant="destructive" size="sm">
        Удалить выбранные
      </Button>
    ),
  },
};
