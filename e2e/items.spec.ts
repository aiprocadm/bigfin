import { test, expect } from '@playwright/test';
import { goTo, hasCredentials, login } from './_login';

/**
 * Позиции: товары и услуги (раздел 14.7 ТЗ-2, пункт 5).
 *
 * ЧТО ЗДЕСЬ БЫЛО. Три пустых теста с телом `() => {}`. Они проходили
 * зелёными всегда и ни разу ничего не проверили — это хуже отсутствия
 * теста: отсутствие видно, а зелёная галочка успокаивает.
 *
 * ЧТО СТАЛО. Сценарий не создаёт позиций: на общем стенде это чужие
 * данные. Он проверяет то, ради чего экран существует, — что список
 * открывается, отвечает на поиск и объясняет себя.
 */
test.describe('позиции', () => {
  test.skip(
    !hasCredentials(),
    'Нужны PLAYWRIGHT_EMAIL и PLAYWRIGHT_PASSWORD — см. e2e/_login.ts',
  );

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goTo(page, '/items');
  });

  test('список открывается', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Позиции/ }).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('у экрана есть объяснение простыми словами', async ({ page }) => {
    await page.getByRole('button', { name: 'Что это за экран' }).click();

    await expect(page.getByRole('dialog')).toContainText(
      'продаёте и покупаете',
    );
  });

  test('форма новой позиции открывается и требует название', async ({
    page,
  }) => {
    // Проверяем отказ, а не создание: отказ ничего не оставляет после себя
    // на общем стенде.
    await goTo(page, '/items/new');

    await page.getByRole('button', { name: /Сохранить/ }).first().click();

    await expect(page.locator('form')).toContainText(/обязательн/i, {
      timeout: 15_000,
    });
  });
});
