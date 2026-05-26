import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';

import { Link } from './Link';

const meta: Meta<typeof Link> = {
  title: 'Components/Link',
  component: Link,
  tags: ['autodocs'],
  decorators: [(Story) => <MemoryRouter>{Story()}</MemoryRouter>],
};
export default meta;
type Story = StoryObj<typeof Link>;

export const Default: Story = {
  args: { to: '/auth/register', children: 'Зарегистрируйтесь' },
};

export const Muted: Story = {
  args: { to: '/auth/forgot-password', children: 'Забыли пароль?', variant: 'muted' },
};
