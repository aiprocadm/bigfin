import type { Meta, StoryObj } from '@storybook/react';
import { ArrowRight } from 'lucide-react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: 'Войти', variant: 'primary' },
};

export const Secondary: Story = {
  args: { children: 'Отмена', variant: 'secondary' },
};

export const Ghost: Story = {
  args: { children: 'Подробнее', variant: 'ghost' },
};

export const LinkStyle: Story = {
  args: { children: 'Забыли пароль?', variant: 'link' },
};

export const Destructive: Story = {
  args: { children: 'Удалить', variant: 'destructive' },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        Войти <ArrowRight className="h-4 w-4" />
      </>
    ),
  },
};

export const Disabled: Story = {
  args: { children: 'Disabled', disabled: true },
};

export const Loading: Story = {
  args: { children: 'Загрузка...', disabled: true },
};
