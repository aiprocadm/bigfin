import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Route } from 'react-router-dom';

import { ResetPasswordPage } from './ResetPasswordPage';

const meta: Meta<typeof ResetPasswordPage> = {
  title: 'Auth/ResetPasswordPage',
  component: ResetPasswordPage,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter
        initialEntries={['/auth/reset_password/storybook-fake-token']}
      >
        <Route path="/auth/reset_password/:token">{Story()}</Route>
      </MemoryRouter>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ResetPasswordPage>;

export const Default: Story = {};
