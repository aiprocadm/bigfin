// М4 (карта v15): когда владелец закрыл регистрацию, страница всё равно
// показывала форму — человек заполнял её целиком и только потом получал
// отказ. Онбординг должен говорить правду сразу.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// jsdom не умеет ResizeObserver — его ждёт sonner (Toaster на странице).
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const signupDisabled = { value: false };

vi.mock('@/hooks/query/authentication', () => ({
  useAuthRegister: () => ({ mutateAsync: vi.fn() }),
  useAuthLogin: () => ({ mutateAsync: vi.fn() }),
  useAuthSigninTwoFactor: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/containers/Authentication/AuthMetaBoot', () => ({
  useAuthMetaBoot: () => ({ signupDisabled: signupDisabled.value }),
}));

import { RegisterPage } from '../RegisterPage';
import { LoginPage } from '../LoginPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );

describe('RegisterPage: регистрация закрыта', () => {
  it('регистрация открыта — форма на месте', () => {
    signupDisabled.value = false;
    renderPage();

    expect(screen.getByLabelText('Имя')).toBeTruthy();
  });

  it('регистрация закрыта — вместо формы честное объяснение', () => {
    signupDisabled.value = true;
    renderPage();

    // Формы быть не должно: заполнять её бессмысленно.
    expect(screen.queryByLabelText('Имя')).toBeNull();
    expect(screen.getByText(/Регистрация закрыта/i)).toBeTruthy();
  });
  it('на входе не зовут регистрироваться, когда регистрация закрыта', () => {
    // Иначе человек идёт по приглашающей ссылке и упирается в «закрыто».
    signupDisabled.value = true;
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/Зарегистрируйтесь/)).toBeNull();
  });

  it('регистрация открыта — приглашение на входе на месте', () => {
    signupDisabled.value = false;
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Зарегистрируйтесь/)).toBeTruthy();
  });
});
