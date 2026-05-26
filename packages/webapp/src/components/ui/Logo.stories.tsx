import type { Meta, StoryObj } from '@storybook/react';

import { Logo } from './Logo';

const meta: Meta<typeof Logo> = {
  title: 'Brand/Logo',
  component: Logo,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Logo>;

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <Logo size="sm" />
      <Logo size="md" />
      <Logo size="lg" />
      <Logo size="xl" />
    </div>
  ),
};

export const WithMark: Story = { args: { showMark: true, size: 'lg' } };
