import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Route } from 'react-router-dom';

import { EmailConfirmationPage } from './EmailConfirmationPage';

const meta = {
  title: 'Auth/EmailConfirmationPage',
  component: EmailConfirmationPage,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story, ctx) => {
      const url =
        (ctx.parameters?.url as string | undefined) ??
        '/auth/email_confirmation';
      return (
        <MemoryRouter initialEntries={[url]}>
          <Route path="/auth/email_confirmation">
            <Story />
          </Route>
        </MemoryRouter>
      );
    },
  ],
} satisfies Meta<typeof EmailConfirmationPage>;

export default meta;
type Story = StoryObj<typeof meta>;

// NOTE: Storybook не делает реальный network call — в каждом сториз состояние
// зависит только от URL-параметров (token/email есть → verifying, нет → invalid-link).

export const InvalidLink: Story = {};

export const Verifying: Story = {
  parameters: {
    url: '/auth/email_confirmation?token=demo&email=test@bigfin.ru',
  },
};
