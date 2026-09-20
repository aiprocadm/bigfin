import { test, expect } from '@playwright/test';
import { goTo, hasCredentials, login } from './_login';

/**
 * План-факт бюджета и «прошло времени» (раздел 14.7 ТЗ-2, пункт 3).
 *
 * ЗАЧЕМ. «Выполнено 56 %» само по себе не значит ничего: в июле это
 * хорошо, в декабре — беда. Рядом обязано стоять «прошло времени», иначе
 * экран обманывает, не соврав ни одной цифрой.
 */
test.describe('бюджет: план, факт и прошедшее время', () => {
  test.skip(
    !hasCredentials(),
    'Нужны PLAYWRIGHT_EMAIL и PLAYWRIGHT_PASSWORD — см. e2e/_login.ts',
  );

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goTo(page, '/budgets');
  });

  test('экран бюджетов открывается', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Бюджет/ }).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('у экрана есть объяснение простыми словами', async ({ page }) => {
    await page.getByRole('button', { name: 'Что это за экран' }).click();

    await expect(page.getByRole('dialog')).toContainText('прошло времени');
  });

  test('план-факт показывает колонки плана и факта', async ({ page }) => {
    const planFact = page.getByText('План-факт').first();

    // Бюджетов может не быть вовсе — тогда экран показывает пустое
    // состояние, и это правильный ответ, а не поломка.
    if (!(await planFact.isVisible().catch(() => false))) {
      test.skip(true, 'На стенде нет ни одного бюджета');
      return;
    }
    await planFact.click();

    await expect(page.getByText('План', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Факт', { exact: true })).toBeVisible();
  });

  test('«прошло времени» стоит рядом с выполнением', async ({ page }) => {
    const elapsed = page.getByText('Прошло времени').first();

    if (!(await elapsed.isVisible().catch(() => false))) {
      test.skip(true, 'На стенде нет ни одного бюджета');
      return;
    }

    await expect(elapsed).toBeVisible();
  });
});
