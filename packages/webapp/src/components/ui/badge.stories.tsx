import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: 'Активна' } };
export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Черновик' },
};
export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Просрочен' },
};
export const Outline: Story = {
  args: { variant: 'outline', children: 'В обработке' },
};
