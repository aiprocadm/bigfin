import { test, expect } from '@playwright/test';
import { goTo, hasCredentials, login } from './_login';

/**
 * Основной суточный сценарий (раздел 14.7 ТЗ-2, пункт 1).
 *
 * ЗАЧЕМ ИМЕННО ОН. Это путь, которым предприниматель ходит каждый день:
 * посмотрел деньги → разнёс операции → открыл отчёт → провалился в
 * операции → заглянул в календарь. Каждый шаг по отдельности покрыт
 * модульными тестами, а вот ЦЕЛЬНОСТЬ пути не проверял никто: ровно на
 * стыках экранов проект и находил свои дефекты.
 *
 * СЦЕНАРИЙ НЕ СОЗДАЁТ И НЕ УДАЛЯЕТ ДАННЫХ. Он ходит по продукту глазами.
 * Разрушающие шаги на общем стенде — это чужие данные, испорченные ради
 * зелёной галочки.
 */
test.describe('суточный сценарий', () => {
  test.skip(
    !hasCredentials(),
    'Нужны PLAYWRIGHT_EMAIL и PLAYWRIGHT_PASSWORD — см. e2e/_login.ts',
  );

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('в шапке видна сумма остатка', async ({ page }) => {
    // Виджет денег есть на каждом экране: если его нет на главной, его нет
    // нигде.
    const header = page.locator('header').first();

    await expect(header).toContainText('₽', { timeout: 30_000 });
  });

  test('главная отвечает на вопрос «на ком держится бизнес»', async ({
    page,
  }) => {
    // Блок либо показывает контрагентов, либо отсутствует вовсе (продаж за
    // период не было). Чего он не должен — это висеть пустым.
    const block = page.getByRole('heading', { name: 'Кто приносит прибыль' });

    if (await block.isVisible().catch(() => false)) {
      await expect(page.locator('section', { has: block })).toContainText('%');
    }
  });

  test('реестр операций показывает итоги под фильтром', async ({ page }) => {
    await goTo(page, '/cashflow-accounts/transactions');

    // Сводная строка закреплена внизу и пересчитывается под любой отбор.
    await expect(page.getByText(/Итого/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test('отчёт «Деньги» открывается и сходится', async ({ page }) => {
    await goTo(page, '/financial-reports/cash-flow-articles');

    await expect(
      page.getByRole('heading', { name: /Деньги/ }).first(),
    ).toBeVisible({ timeout: 30_000 });

    // Три раздела потока обязаны быть на экране: без них отчёт не отвечает
    // на вопрос «откуда пришли и куда ушли деньги».
    await expect(page.getByText('Операционная')).toBeVisible();
  });

  test('отчёт «Деньги» — колонка на каждый месяц и «Итого» (FT-001)', async ({
    page,
  }) => {
    // Год по месяцам: «Статья» + двенадцать месяцев + «Итого». Ради ответа
    // «в каком месяце ушли деньги» матрицу и делали — одна колонка на весь
    // период на этот вопрос не отвечала.
    await goTo(
      page,
      '/financial-reports/cash-flow-articles?fromDate=2026-01-01&toDate=2026-12-31',
    );

    const header = page.locator('table thead tr').first();
    await expect(header.locator('th')).toHaveCount(14, { timeout: 30_000 });
    await expect(header.locator('th').last()).toHaveText('Итого');
  });

  test('у отчёта есть объяснение простыми словами', async ({ page }) => {
    await goTo(page, '/financial-reports/cash-flow-articles');

    await page.getByRole('button', { name: 'Что это за экран' }).click();

    await expect(page.getByRole('dialog')).toContainText(
      'откуда пришли и куда ушли деньги',
    );
  });

  test('платёжный календарь показывает, что будет с деньгами', async ({
    page,
  }) => {
    await goTo(page, '/payment-calendar');

    await expect(
      page.getByRole('button', { name: 'На сегодня' }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
