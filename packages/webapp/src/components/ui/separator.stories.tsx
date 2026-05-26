import type { Meta, StoryObj } from '@storybook/react';

import { Separator } from './separator';

const meta: Meta<typeof Separator> = {
  title: 'Components/Separator',
  component: Separator,
  tags: ['autodocs'],
};
export default meta;

export const WithText: StoryObj = {
  render: () => (
    <div className="flex w-80 items-center gap-3">
      <Separator className="flex-1" />
      <span className="text-sm text-text-secondary">или</span>
      <Separator className="flex-1" />
    </div>
  ),
};
