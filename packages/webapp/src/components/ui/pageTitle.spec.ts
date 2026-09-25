import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * Заголовок страницы — один (UI-045-1 ТЗ-4, решение R10).
 *
 * БЫЛО (O5 живого прохода 24.09): заголовок стоял в шапке и в теле, да ещё
 * разными словами — «Отчёт о прибылях и убытках» наверху, «Управленческий
 * ОПиУ» ниже. В «Деньгах» — трижды.
 *
 * СТАЛО. Каркас рисует крупный заголовок по подписи маршрута (`pageTitle`),
 * а экран со своим заголовком рисует его через `PageTitle` / `PageHeader` —
 * и тогда заголовок каркаса уступает место. Шапка показывает заголовок
 * только после прокрутки.
 *
 * Сторож держит три вещи:
 * 1. экраны не рисуют заголовок голым `<h1>` — иначе каркас о нём не узнает
 *    и нарисует второй;
 * 2. свой заголовок экрана говорит то же, что подпись маршрута — иначе
 *    шапка после прокрутки и вкладка браузера назовут экран иначе, чем он
 *    сам себя;
 * 3. шапка берёт заголовок из «ушедшего за край», а не из подписи маршрута.
 */
const SRC = path.resolve(__dirname, '../..');
const read = (relative: string) =>
  activeCode(fs.readFileSync(path.join(SRC, relative), 'utf8'));

function tsxFiles(dir: string): string[] {
  return fs.readdirSync(path.join(SRC, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : tsxFiles(rel);
    return /\.tsx$/.test(entry.name) && !/\.(spec|test|stories)\./.test(entry.name) ? [rel] : [];
  });
}

/**
 * Где `<h1>` законен: не экраны панели (вход, публичная страница оплаты,
 * печатные бланки, мастер первой настройки) и старые крупные цифры форм.
 * Каждый — с причиной; новый в этот список попадает только осознанно.
 */
const H1_ALLOWED: Record<string, string> = {
  'components/ui/page-title.tsx': 'сам заголовок',
  'components/auth/EmailConfirmationPage.tsx': 'вход, вне панели',
  'components/auth/ForgotPasswordPage.tsx': 'вход, вне панели',
  'components/auth/InviteAcceptPage.tsx': 'вход, вне панели',
  'components/auth/LoginPage.tsx': 'вход, вне панели',
  'components/auth/RegisterPage.tsx': 'вход, вне панели',
  'components/auth/RegisterVerifyPage.tsx': 'вход, вне панели',
  'components/auth/ResetPasswordPage.tsx': 'вход, вне панели',
  'components/legal/LegalDocumentPage.tsx': 'юридическая страница, вне панели',
  'components/legal/LegalPlaceholderPage.tsx': 'юридическая страница, вне панели',
  'containers/PaymentPortal/PaymentPage.tsx': 'публичная страница оплаты',
  'containers/PaymentPortal/PaymentPortal.tsx': 'публичная страница оплаты',
  'containers/Sales/Invoices/InvoiceCustomize/PaperTemplate.tsx': 'печатный бланк',
  'containers/Sales/Estimates/SendMailViewDrawer/SendMailViewPreview.tsx': 'образец письма',
  'containers/ElementCustomize/ElementCustomizeHeader.tsx': 'окно настройки бланка',
  'containers/Setup/SetupLeftSection.tsx': 'мастер первой настройки, вне панели',
  'containers/Subscriptions/BillingSubscription.tsx': 'карточка тарифа, старая',
  'containers/Sales/PaymentsReceived/PaymentReceiveForm/PaymentReceiveFormHeader.tsx':
    'крупная сумма старой формы',
  'components/PageForm/PageFormBigNumber.tsx': 'крупная сумма старой формы',
  'components/EmptyStatus/EmptyStatus.tsx': 'старое пустое состояние (этап 52)',
  'components/Dashboard/DashboardErrorBoundary.tsx': 'экран сбоя вместо страницы',
  'components/Dashboard/DashboardSummary.tsx': 'старая сводка, не в маршрутах',
};

interface RouteEntry {
  path: string;
  component: string;
  titleKey?: string;
}

/** Маршруты панели: путь, файл экрана и ключ подписи. */
function routes(): RouteEntry[] {
  const source = read('routes/dashboard.tsx');
  const entries: RouteEntry[] = [];
  // Записи реестра — объекты верхнего уровня списка: «  {» … «  },».
  for (const block of source.split(/\n  \{\n/).slice(1)) {
    const routePath = /path:\s*[`']([^`']+)[`']/.exec(block)?.[1];
    const component = /import\(\s*'@\/([^']+)'\s*\)/.exec(block)?.[1];
    if (!routePath || !component) continue;
    const titleKey = /pageTitle:\s*intl\.get\('([^']+)'\)/.exec(block)?.[1];
    entries.push({ path: routePath, component, titleKey });
  }
  return entries;
}

function resolveComponent(relative: string): string | null {
  for (const candidate of [`${relative}.tsx`, `${relative}/index.tsx`, `${relative}.ts`]) {
    if (fs.existsSync(path.join(SRC, candidate))) return candidate;
  }
  return null;
}

/** Ключи, которыми экран подписывает свой заголовок. */
function ownTitleKeys(code: string): string[] {
  const keys = new Set<string>();
  for (const m of code.matchAll(/<PageTitle>\s*\{\s*intl\.get\(\s*'([^']+)'/g)) keys.add(m[1]);
  for (const m of code.matchAll(/<PageHeader[\s\S]*?title=\{\s*intl\.get\(\s*'([^']+)'/g)) keys.add(m[1]);
  return [...keys];
}

describe('заголовок страницы — один', () => {
  it('экраны не рисуют заголовок голым <h1>', () => {
    const raw = [...tsxFiles('containers'), ...tsxFiles('components')].filter(
      (file) => !H1_ALLOWED[file] && /<h1[\s>]/.test(read(file)),
    );
    expect(raw).toEqual([]);
  });

  it('список исключений не отстаёт: в каждом исключении <h1> и правда есть', () => {
    const stale = Object.keys(H1_ALLOWED).filter(
      (file) => !fs.existsSync(path.join(SRC, file)) || !/<h1[\s>]/.test(read(file)),
    );
    expect(stale).toEqual([]);
  });

  it('разбор маршрутов работает', () => {
    const list = routes();
    expect(list.length).toBeGreaterThan(100);
    expect(list.find((r) => r.path === '/debts')?.component).toBe('containers/Debts/DebtsPage');
  });

  it('свой заголовок экрана говорит то же, что подпись маршрута', () => {
    const mismatched = routes().flatMap((route) => {
      const file = resolveComponent(route.component);
      if (!file) return [];
      const keys = ownTitleKeys(read(file));
      if (keys.length === 0 || !route.titleKey) return [];
      return keys.includes(route.titleKey)
        ? []
        : [`${route.path}: маршрут «${route.titleKey}», экран «${keys.join(', ')}»`];
    });
    expect(mismatched).toEqual([]);
  });

  it('шапка берёт заголовок из ушедшего за край, а не из подписи маршрута', () => {
    const topbar = read('components/Dashboard/ConnectedTopbar.tsx');
    expect(topbar).toContain('usePageTitleState()');
    expect(topbar).not.toContain('state.dashboard?.pageTitle');
    // Копия в шапке — не второй заголовок страницы.
    expect(topbar).not.toMatch(/<h1[\s>]/);
  });

  it('каркас рисует заголовок по подписи маршрута и уступает своему', () => {
    const content = read('components/Dashboard/DashboardContentRoute.tsx');
    const routeTitle = read('components/Dashboard/RouteTitle.tsx');
    expect(content).toContain('<RouteTitle title={route.pageTitle} />');
    expect(routeTitle).toContain('ownTitles > 0');
    expect(routeTitle).toContain('<PageTitle fromRoute>');
  });
});
