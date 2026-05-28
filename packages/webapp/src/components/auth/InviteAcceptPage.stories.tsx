import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Route } from 'react-router-dom';

import { InviteAcceptPage } from './InviteAcceptPage';

const meta = {
  title: 'Auth/InviteAcceptPage',
  component: InviteAcceptPage,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/auth/invite/demo-token/accept']}>
        <Route path="/auth/invite/:token/accept">
          <Story />
        </Route>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof InviteAcceptPage>;

export default meta;
type Story = StoryObj<typeof meta>;

// NOTE: В Storybook InviteAcceptProvider не сможет загрузить meta (нет backend).
// Ожидаемое поведение — показ Spinner «Загружаем приглашение...» вечно.
// Для проверки формы — временно замокать useInviteAcceptContext локально
// или полная интеграционная проверка на staging.
export const LoadingState: Story = {};
