import { test, expect, Page } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { clearLocalStorage, defaultPageConfig } from './_utils';

// These specs target the RU-first shadcn auth flow (D-redesign Phase 2).
// The pages render hardcoded Russian (not via i18n), so assertions are
// locale-independent. Routes are unchanged: /auth/login, /auth/register and
// the legacy /auth/send_reset_password are all still served.

let authPage: Page;

test.describe('аутентификация', () => {
  test.beforeAll(async ({ browser }) => {
    authPage = await browser.newPage({ ...defaultPageConfig() });
  });
  test.afterAll(async () => {
    await authPage.close();
  });
  test.afterEach(async ({ context }) => {
    await context.clearCookies();
    await clearLocalStorage(authPage);
  });

  test.describe('вход', () => {
    test.beforeEach(async () => {
      await authPage.goto('/auth/login');
    });

    test('показывает страницу входа', async () => {
      await expect(authPage.locator('h1')).toContainText('Войдите в Bigfin');
      await expect(authPage.locator('body')).toContainText('Нет аккаунта?');
      await expect(
        authPage.getByRole('link', { name: 'Зарегистрируйтесь' }),
      ).toBeVisible();
    });

    test('требует email и пароль', async () => {
      await authPage.getByRole('button', { name: 'Войти', exact: true }).click();

      await expect(authPage.locator('form')).toContainText(
        'Введите корректный email',
      );
      await expect(authPage.locator('form')).toContainText('Введите пароль');
    });

    test('ведёт на регистрацию по ссылке «Зарегистрируйтесь»', async () => {
      await authPage.getByRole('link', { name: 'Зарегистрируйтесь' }).click();
      await expect(authPage).toHaveURL(/\/auth\/register$/);
    });

    test('сообщает о неверных email или пароле', async () => {
      await authPage.getByLabel('Email').fill(faker.internet.email());
      // The password FormControl wraps the input in a div (for the show/hide
      // toggle), so shadcn binds the label id to the div, not the input —
      // getByLabel can't reach it. Target the input by its autocomplete hint.
      await authPage
        .locator('input[autocomplete="current-password"]')
        .fill(faker.internet.password());

      await authPage.getByRole('button', { name: 'Войти', exact: true }).click();

      await expect(
        authPage.getByText('Неверный email или пароль'),
      ).toBeVisible();
    });
  });

  test.describe('регистрация', () => {
    test.beforeEach(async () => {
      await authPage.goto('/auth/register');
    });

    test('требует заполнить обязательные поля', async () => {
      await authPage
        .getByRole('button', { name: 'Зарегистрироваться' })
        .click();

      const form = authPage.locator('form');
      await expect(form).toContainText('Введите имя');
      await expect(form).toContainText('Введите корректный email');
      await expect(form).toContainText('Пароль должен быть не короче 10 символов');
      await expect(form).toContainText('Необходимо согласие с условиями');
    });

    test('проверяет совпадение паролей', async () => {
      await authPage.getByLabel('Имя').fill(faker.person.firstName());
      await authPage.getByLabel('Email').fill(faker.internet.email());
      // Password input sits inside a wrapper div (show/hide toggle), so it has
      // no associated label — select it by its unique placeholder instead.
      await authPage
        .getByPlaceholder('Минимум 10 символов')
        .fill('parol1234567');
      await authPage.getByLabel('Подтвердите пароль').fill('drugoiParol99');

      await authPage
        .getByRole('button', { name: 'Зарегистрироваться' })
        .click();

      await expect(authPage.locator('form')).toContainText('Пароли не совпадают');
    });

    test('ведёт на вход по ссылке «Войдите»', async () => {
      await authPage.getByRole('link', { name: 'Войдите' }).click();
      await expect(authPage).toHaveURL(/\/auth\/login$/);
    });
  });

  test.describe('сброс пароля', () => {
    test.beforeEach(async () => {
      await authPage.goto('/auth/send_reset_password');
    });

    test('требует email', async () => {
      await authPage
        .getByRole('button', { name: 'Отправить ссылку' })
        .click();

      await expect(authPage.locator('form')).toContainText(
        'Введите корректный email',
      );
    });

    test('возвращает ко входу', async () => {
      await authPage.getByRole('link', { name: 'Вернуться к входу' }).click();
      await expect(authPage).toHaveURL(/\/auth\/login$/);
    });
  });
});
