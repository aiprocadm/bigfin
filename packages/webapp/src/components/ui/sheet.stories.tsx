import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import { Sheet } from './sheet';

/**
 * Шторка: справа на ноутбуке, снизу на телефоне (сузьте окно просмотра).
 */
const meta = {
  title: 'UI/Sheet',
  component: Sheet,
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

const Live = () => {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="bigfin-ui p-4">
      <Button onClick={() => setOpen(true)}>Открыть шторку</Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Фильтры"
        description="Отберите операции по статье, счёту и сумме"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Сбросить
            </Button>
            <Button onClick={() => setOpen(false)}>Показать 12 операций</Button>
          </>
        }
      >
        <p className="text-body text-text-secondary">Поля фильтров…</p>
      </Sheet>
    </div>
  );
};

export const Filters: Story = {
  args: { open: true, onOpenChange: () => {}, title: 'Фильтры', children: null },
  render: () => <Live />,
};
