import type { Meta, StoryObj } from '@storybook/react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Button } from './button';

const meta = {
  title: 'UI/Dialog',
  component: Dialog,
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const Body = () => (
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Удалить счёт?</DialogTitle>
      <DialogDescription>
        Счёт и все его проводки будут удалены без возможности восстановления.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="secondary">Отмена</Button>
      </DialogClose>
      <Button variant="destructive">Удалить</Button>
    </DialogFooter>
  </DialogContent>
);

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Открыть окно</Button>
      </DialogTrigger>
      <Body />
    </Dialog>
  ),
};

export const Open: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button>Открыть окно</Button>
      </DialogTrigger>
      <Body />
    </Dialog>
  ),
};
