import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Components/Spinner',
  component: Spinner,
  tags: ['autodocs'],
};
export default meta;

export const Default: StoryObj = { render: () => <Spinner /> };

export const InsideButton: StoryObj = {
  render: () => (
    <Button disabled>
      <Spinner size="sm" />
      Загрузка...
    </Button>
  ),
};
