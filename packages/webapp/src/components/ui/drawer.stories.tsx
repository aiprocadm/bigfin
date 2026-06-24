import type { Meta, StoryObj } from '@storybook/react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './drawer';
import { Button } from './button';

const meta = {
  title: 'UI/Drawer',
  component: Drawer,
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

const Body = ({ side }: { side?: 'right' | 'left' | 'top' | 'bottom' }) => (
  <DrawerContent side={side}>
    <DrawerHeader>
      <DrawerTitle>Новый контрагент</DrawerTitle>
      <DrawerDescription>
        Заполните реквизиты и сохраните карточку контрагента.
      </DrawerDescription>
    </DrawerHeader>
    <DrawerFooter>
      <DrawerClose asChild>
        <Button variant="secondary">Отмена</Button>
      </DrawerClose>
      <Button>Сохранить</Button>
    </DrawerFooter>
  </DrawerContent>
);

export const Right: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button>Открыть панель</Button>
      </DrawerTrigger>
      <Body side="right" />
    </Drawer>
  ),
};

export const OpenRight: Story = {
  render: () => (
    <Drawer defaultOpen>
      <DrawerTrigger asChild>
        <Button>Открыть панель</Button>
      </DrawerTrigger>
      <Body side="right" />
    </Drawer>
  ),
};
