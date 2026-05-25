import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: 'name@company.ru' },
};

export const Email: Story = {
  args: { type: 'email', placeholder: 'Email' },
};

export const Password: Story = {
  args: { type: 'password', placeholder: '••••••••' },
};

export const Disabled: Story = {
  args: { placeholder: 'Disabled', disabled: true },
};

export const WithValue: Story = {
  args: { defaultValue: 'pre-filled' },
};
