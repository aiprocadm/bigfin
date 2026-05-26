import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';

import { ForgotPasswordPage } from './ForgotPasswordPage';

const meta: Meta<typeof ForgotPasswordPage> = {
  title: 'Auth/ForgotPasswordPage',
  component: ForgotPasswordPage,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <MemoryRouter>{Story()}</MemoryRouter>],
};
export default meta;

type Story = StoryObj<typeof ForgotPasswordPage>;

export const Default: Story = {};
