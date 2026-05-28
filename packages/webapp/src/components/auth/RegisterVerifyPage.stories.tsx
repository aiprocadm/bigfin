import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';

import { RegisterVerifyPage } from './RegisterVerifyPage';

const meta = {
  title: 'Auth/RegisterVerifyPage',
  component: RegisterVerifyPage,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof RegisterVerifyPage>;

export default meta;
type Story = StoryObj<typeof meta>;

// NOTE: useAuth* хуки в Storybook возвращают undefined/null —
// email отрендерится как «ваш email», кнопка resend будет no-op.
// Это нормально для визуальной проверки layout/стилей.
export const Default: Story = {};
