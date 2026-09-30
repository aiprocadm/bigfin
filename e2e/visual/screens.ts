import { Page } from '@playwright/test';

/**
 * 26 эталонных экранов блока Б6 (§11 ТЗ-4).
 *
 * ОДИН СПИСОК НА ДВА СЦЕНАРИЯ. По нему проверяется доступность (axe, этап 55)
 * и снимаются эталоны (этап 56). Два списка разошлись бы при первом же новом
 * экране, и один из сценариев тихо перестал бы его проверять.
 *
 * `open` — что сделать после перехода, если экран — не адрес, а состояние:
 * вкладка, выбранный бюджет, открытое окно.
 */
export interface Screen {
  /** Имя эталона: латиницей, без пробелов. */
  name: string;
  /** Как экран назван в чек-листе владельца. */
  title: string;
  path: string;
  /** Экран без входа (страница входа). */
  guest?: boolean;
  open?: (page: Page) => Promise<void>;
}

export const SCREENS: Screen[] = [
  { name: 'home', title: 'Главная', path: '/' },
  { name: 'registry', title: 'Реестр', path: '/cashflow-accounts/transactions' },
  { name: 'accounts', title: 'Счета', path: '/cashflow-accounts' },
  { name: 'reconciliation', title: 'Сверка', path: '/cashflow-accounts/reconciliation' },
  { name: 'trash', title: 'Корзина', path: '/cashflow-accounts/trash' },
  { name: 'cash-flow-articles', title: 'Деньги (ДДС)', path: '/financial-reports/cash-flow-articles' },
  { name: 'pnl-managerial', title: 'ОПиУ управленческий', path: '/financial-reports/profit-loss-sheet?view=managerial' },
  { name: 'pnl-accounting', title: 'ОПиУ бухгалтерский', path: '/financial-reports/profit-loss-sheet?view=accounting' },
  { name: 'balance-sheet', title: 'Баланс', path: '/financial-reports/balance-sheet' },
  { name: 'debts-receivable', title: 'Долги нам', path: '/debts' },
  {
    name: 'debts-payable',
    title: 'Долги мы',
    path: '/debts',
    open: (page) => page.getByRole('radio', { name: 'Мы должны' }).click(),
  },
  { name: 'all-reports', title: 'Все отчёты', path: '/financial-reports' },
  { name: 'payment-calendar', title: 'Платёжный календарь — список', path: '/payment-calendar' },
  {
    name: 'payment-calendar-matrix',
    title: 'Платёжный календарь — план-факт',
    path: '/payment-calendar',
    open: (page) => page.getByRole('radio', { name: 'План / факт' }).click(),
  },
  { name: 'budgets', title: 'Бюджеты — список', path: '/budgets' },
  {
    name: 'budget-plan-fact',
    title: 'Бюджеты — план-факт',
    path: '/budgets',
    open: async (page) => {
      await page.locator('main button[aria-pressed]').first().click();
      await page.getByRole('button', { name: 'План-факт' }).click();
    },
  },
  { name: 'payment-requests', title: 'Заявки', path: '/payment-requests' },
  { name: 'financial-model', title: 'Финмодель', path: '/financial-model' },
  { name: 'ai-cfo', title: 'AI CFO', path: '/ai-chat' },
  { name: 'deals', title: 'Сделки', path: '/deals' },
  { name: 'customers', title: 'Клиенты', path: '/customers' },
  { name: 'invoice-form', title: 'Счёт покупателю (форма)', path: '/invoices/new' },
  {
    name: 'money-in-dialog',
    title: 'Приход денег (окно)',
    path: '/cashflow-accounts/transactions',
    open: async (page) => {
      await page.getByRole('button', { name: 'Добавить', exact: true }).first().click();
      await page.getByRole('menuitem', { name: 'Приход денег' }).click();
      await page.getByRole('dialog').waitFor();
    },
  },
  { name: 'articles', title: 'Статьи', path: '/management-articles' },
  { name: 'preferences-general', title: 'Настройки «Общие»', path: '/preferences/general' },
  { name: 'login', title: 'Вход', path: '/auth/login', guest: true },
];
