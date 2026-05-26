import type { Meta, StoryObj } from '@storybook/react';

import { Skeleton } from './skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Components/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
};
export default meta;

export const FormPlaceholder: StoryObj = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  ),
};
