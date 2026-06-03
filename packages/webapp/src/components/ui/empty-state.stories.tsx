import type { Meta, StoryObj } from '@storybook/react';
import { Users } from 'lucide-react';
import { EmptyState } from './empty-state';
import { Button } from './button';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  decorators: [
    (Story) => (
      <div className="bigfin-ui light bg-background p-8">
        <Story />
      </div>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof EmptyState> = {
  args: {
    icon: <Users className="h-8 w-8" />,
    title: 'Пока нет клиентов',
    description: 'Добавьте первого клиента, чтобы начать.',
    action: <Button>+ Новый клиент</Button>,
  },
};
