import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import { ConfirmDialog } from './confirm-dialog';

const meta = {
  title: 'UI/ConfirmDialog',
  component: ConfirmDialog,
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const DangerExample = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Удалить клиента
      </Button>
      <ConfirmDialog
        open={open}
        title="Удалить клиента"
        description="После удаления этого клиента восстановить не получится. Точно удалить?"
        confirmLabel="Удалить"
        intent="danger"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
};

export const Danger: Story = {
  args: {
    open: true,
    title: 'Удалить клиента',
    confirmLabel: 'Удалить',
    onConfirm: () => {},
    onCancel: () => {},
  },
  render: () => <DangerExample />,
};

export const Default: Story = {
  args: {
    open: true,
    title: 'Отключить филиал',
    description: 'Филиал перестанет показываться в списках. Включить его можно в любой момент.',
    confirmLabel: 'Отключить',
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const Loading: Story = {
  args: {
    open: true,
    title: 'Удалить счёт',
    description: 'После удаления этот счёт восстановить не получится. Точно удалить?',
    confirmLabel: 'Удалить',
    intent: 'danger',
    loading: true,
    onConfirm: () => {},
    onCancel: () => {},
  },
};
