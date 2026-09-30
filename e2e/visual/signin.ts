import fs from 'fs';
import { Browser, BrowserContext, BrowserContextOptions } from '@playwright/test';
import { hasCredentials, login } from '../_login';

/**
 * Вход для сценариев по 26 экранам.
 *
 * ДВА СПОСОБА, И ОБА ИЗ ОКРУЖЕНИЯ.
 * - `PLAYWRIGHT_EMAIL` + `PLAYWRIGHT_PASSWORD` — обычный вход через форму,
 *   как в остальных сценариях.
 * - `PLAYWRIGHT_SIGNIN_FILE` — путь к ответу сервера на вход
 *   (`/api/auth/signin` или `/api/demo/one_click_signin`). Так снимается демо
 *   организация: у неё случайный пароль, и через форму в неё не войти.
 *
 * Вход делается один раз на контекст: 26 экранов × 2 ширины × 2 темы через
 * форму — это сто лишних входов.
 */
const SIGNIN_FILE = process.env.PLAYWRIGHT_SIGNIN_FILE ?? '';

export const canSignIn = (): boolean => hasCredentials() || Boolean(SIGNIN_FILE);

/** Контекст без входа (страница входа) — с теми же настройками, что и со входом. */
export async function guestContext(browser: Browser, baseURL: string, options: BrowserContextOptions): Promise<BrowserContext> {
  const context = await browser.newContext({ ...options, locale: 'ru-RU' });
  await prepare(context, baseURL);
  return context;
}

async function prepare(context: BrowserContext, baseURL: string): Promise<void> {
  // Панель отладки запросов в сборке для разработки закрывала бы угол экрана.
  await context.addInitScript(() => {
    try {
      localStorage.setItem('reactQueryDevtoolsOpen', 'false');
    } catch (e) {
      // без хранилища — просто без этой настройки
    }
  });
  await context.addCookies([{ name: 'locale', value: 'ru', url: baseURL }]);
}

export async function signedInContext(
  browser: Browser,
  baseURL: string,
  options: BrowserContextOptions,
): Promise<BrowserContext> {
  const context = await browser.newContext({ ...options, locale: 'ru-RU' });
  await prepare(context, baseURL);

  if (SIGNIN_FILE) {
    const auth = JSON.parse(fs.readFileSync(SIGNIN_FILE, 'utf8'));
    await context.addCookies(
      [
        ['token', auth.access_token],
        ['organization_id', auth.organization_id],
        ['authenticated_user_id', auth.user_id],
      ].map(([name, value]) => ({ name: String(name), value: String(value), url: baseURL })),
    );
  } else {
    const page = await context.newPage();
    await login(page);
    await page.close();
  }
  return context;
}
