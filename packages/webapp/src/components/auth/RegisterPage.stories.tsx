import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';

import { RegisterPage } from './RegisterPage';

const meta: Meta<typeof RegisterPage> = {
  title: 'Auth/RegisterPage',
  component: RegisterPage,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <MemoryRouter>{Story()}</MemoryRouter>],
};
export default meta;

type Story = StoryObj<typeof RegisterPage>;

export const Default: Story = {};
