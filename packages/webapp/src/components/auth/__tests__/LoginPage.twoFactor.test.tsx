// Приёмка шага 2FA на настоящем LoginPage: после ответа requires_two_factor
// должна показаться форма кода, поле обязано принимать ввод, а сабмит —
// уходить на /auth/signin/2fa.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// jsdom не умеет ResizeObserver — его ждёт sonner (Toaster на странице).
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const loginMock = vi.fn();
const twoFactorMock = vi.fn();

vi.mock('@/hooks/query/authentication', () => ({
  useAuthLogin: () => ({ mutateAsync: loginMock }),
  useAuthSigninTwoFactor: () => ({ mutateAsync: twoFactorMock }),
}));

import { LoginPage } from '../LoginPage';

beforeEach(() => {
  loginMock.mockReset();
  twoFactorMock.mockReset();
});

async function submitCredentials() {
  fireEvent.change(screen.getByPlaceholderText('name@company.ru'), {
    target: { value: 'a@b.ru' },
  });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), {
    target: { value: 'password12' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Войти$/ }));
}

describe('LoginPage: второй шаг 2FA', () => {
  it('показывает форму кода, принимает ввод и отправляет код', async () => {
    loginMock.mockResolvedValue({
      data: { requires_two_factor: true, two_factor_token: 'PENDING' },
    });
    twoFactorMock.mockResolvedValue({ data: { access_token: 'ok' } });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    await submitCredentials();

    const input = (await screen.findByPlaceholderText(
      '123456',
    )) as HTMLInputElement;

    fireEvent.change(input, { target: { value: '123456' } });
    expect(input.value).toBe('123456');

    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }));

    // Старая версия RTL без waitFor — ждём микрозадачи вручную.
    await new Promise((r) => setTimeout(r, 0));

    expect(twoFactorMock).toHaveBeenCalledWith({
      twoFactorToken: 'PENDING',
      code: '123456',
    });
  });
});
