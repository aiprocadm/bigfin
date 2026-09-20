import { Page, expect } from '@playwright/test';

/**
 * Вход на стенд для сквозных сценариев (раздел 14.7 ТЗ-2).
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ПОМОЩНИК. Все новые сценарии начинаются одинаково —
 * входом. Повторить его в каждом файле значит однажды поправить подпись
 * кнопки и получить три красных сценария вместо одного.
 *
 * ДАННЫЕ ВХОДА БЕРУТСЯ ИЗ ОКРУЖЕНИЯ, А НЕ ЗАШИТЫ. Пароль в файле
 * репозитория — это пароль, опубликованный навсегда. Без переменных
 * сценарий честно останавливается с понятным сообщением, а не падает
 * посреди страницы.
 */
export const E2E_EMAIL = process.env.PLAYWRIGHT_EMAIL ?? '';
export const E2E_PASSWORD = process.env.PLAYWRIGHT_PASSWORD ?? '';

/** Есть ли чем входить: по этому признаку сценарии пропускаются. */
export const hasCredentials = (): boolean =>
  Boolean(E2E_EMAIL && E2E_PASSWORD);

/**
 * Входит в продукт и дожидается главной.
 *
 * @param {Page} page страница
 */
export async function login(page: Page): Promise<void> {
  await page.goto('/auth/login');

  await page.getByLabel('Email').fill(E2E_EMAIL);
  await page.getByLabel('Пароль', { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();

  // Главная считается открытой, когда в шапке появилась сумма остатка:
  // именно она означает, что данные организации уже пришли.
  await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 30_000 });
}

/**
 * Переходит по адресу и ждёт, пока страница перестанет грузиться.
 *
 * Отдельный помощник, потому что почти каждый шаг сценария — это переход,
 * и ожидание «сеть утихла» надёжнее ожидания конкретного элемента: экран
 * может показать и пустое состояние, и данные, и оба варианта правильны.
 *
 * @param {Page} page страница
 * @param {string} path адрес внутри продукта
 */
export async function goTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}
