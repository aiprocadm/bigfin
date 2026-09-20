import { test, expect } from '@playwright/test';
import { goTo, hasCredentials, login } from './_login';

/**
 * Статьи объясняют себя (раздел 14.7 ТЗ-2, пункт 2).
 *
 * ЗАЧЕМ. Статья учёта — самое непонятное место продукта для человека без
 * бухгалтерского образования: он выбирает её при каждой операции и не
 * видит последствий выбора. Карточка «Куда попадает» и есть ответ, и
 * проверять её надо целиком — от вкладки вида до перехода в отчёт.
 */
test.describe('статьи учёта объясняют себя', () => {
  test.skip(
    !hasCredentials(),
    'Нужны PLAYWRIGHT_EMAIL и PLAYWRIGHT_PASSWORD — см. e2e/_login.ts',
  );

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goTo(page, '/management-articles');
  });

  test('видны все пять видов статей', async ({ page }) => {
    // Пять, а не два: активы, обязательства и капитал появились на этапе
    // 17, и без них покупка станка снова стала бы «расходом».
    for (const kind of [
      'Доходы',
      'Расходы',
      'Активы',
      'Обязательства',
      'Капитал',
    ]) {
      await expect(page.getByRole('tab', { name: kind })).toBeVisible({
        timeout: 30_000,
      });
    }
  });

  test('вкладка остаётся в адресе', async ({ page }) => {
    // Иначе ссылку нельзя переслать: получатель откроет не тот вид.
    await page.getByRole('tab', { name: 'Активы' }).click();

    await expect(page).toHaveURL(/kind=asset/);
  });

  test('у экрана есть объяснение простыми словами', async ({ page }) => {
    await page.getByRole('button', { name: 'Что это за экран' }).click();

    await expect(page.getByRole('dialog')).toContainText(
      'за что эти деньги',
    );
  });

  test('схема «Куда попадает» показывает три карточки', async ({ page }) => {
    // Прибыль, Деньги и Баланс: человек должен видеть, что статья влияет
    // не на один отчёт, а на несколько — или ни на один.
    const map = page.getByText('Куда попадает').first();

    if (await map.isVisible().catch(() => false)) {
      await map.click();
    }

    await expect(page.getByText('Прибыль (ОПиУ)')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Деньги (ДДС)')).toBeVisible();
    await expect(page.getByText('Баланс')).toBeVisible();
  });
});
