import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  orphanFiles,
  ENTRY,
  SRC,
  reachableFrom,
  importSpecifiers,
  rootFiles,
  storyRoots,
  setupFiles,
  isStoryFile,
  isCheckFile,
  brokenImports,
  withoutComments,
} from './orphanFiles';

/**
 * Д2 карты v77. Сколько в витрине файлов, до которых нельзя добраться.
 *
 * Такой файл не попадает в сборку и не выполняется никогда. Но он лежит в
 * дереве, его читают глазами и правят — а правка в мёртвом файле не меняет
 * ничего, и это выясняется в лучшем случае через час.
 *
 * Как это нашлось: карта v77 искала другое — крючки, которые читают контекст
 * вне поставщика. Такой поломки в живом коде не оказалось ни одной. Зато у
 * шестидесяти девяти «нарушителей» обнаружилась общая причина: их просто никто
 * не рисует. Это остатки экранов, заменённых версиями V2.
 *
 * Порог опущен ровно до текущего числа. Он может только уменьшаться: новые
 * сироты заводить нельзя, а старые разбираются отдельными картами.
 */

/**
 * Текущее число сирот. Опускать при разборе; поднимать — нельзя.
 *
 * v77: 828 → 759 (удалено 69 остатков от перехода на V2).
 * v78: 759 → 354 (удалены 405 файлов — замкнутые мёртвые кусты ящиков,
 * отчётов, окон и экранов продаж и закупок).
 * v79: 354 → 187. Из них 42 файла сиротами вовсе не были: разбор ввозов
 * спотыкался о слово `import` внутри строк (см. пояснение к `IMPORT_RE`), и
 * файл маршрутов «терял» половину экранов. Остальное — удалённые 125 файлов
 * целиком мёртвых папок: «Проекты», три отчёта без серверных ручек, интеграция
 * с СМС, ящик деталей контакта.
 * v80: 187 → 99, и не удалён ни один файл. Сторож знал только один корень —
 * `*.spec.*`. А запускаются сами ещё три вида: `*.test.*` (прогонщик берёт оба,
 * см. `include` в `vite.config.mts`), истории Storybook и файл подготовки
 * прогона. Плюс объявления `.d.ts`, которых ввоз не касается вовсе.
 * Восемьдесят восемь живых файлов числились мёртвыми. Сверх того удалены 12:
 * старый сайдбар панели вместе с накладкой (его место занял
 * `components/ui/Sidebar.tsx` через `ConnectedSidebar`) и `setupTests.tsx` —
 * остаток от прежней сборки, который не подключает никто. Итого 187 → 87.
 */
const ORPHANS_CEILING = 87;

describe('файлы, до которых нельзя добраться', () => {
  // Сторож читает все файлы витрины, и под общей нагрузкой пять секунд по
  // умолчанию ему малы (карта v74).
  it('их не становится больше', { timeout: 60_000 }, () => {
    const orphans = orphanFiles();

    expect(orphans.length).toBeLessThanOrEqual(ORPHANS_CEILING);
  });

  // Без этой проверки сторож «зеленел» бы бесплатно, если разбор ввозов
  // сломается и всё окажется достижимым.
  it('разбор ввозов действительно работает', { timeout: 60_000 }, () => {
    expect(fs.existsSync(ENTRY)).toBe(true);

    const live = reachableFrom([ENTRY]);
    // От точки входа видно основную часть продукта.
    expect(live.size).toBeGreaterThan(2000);
    // И она видит заведомо живой файл.
    expect(live.has(path.join(SRC, 'components', 'App.tsx'))).toBe(true);
  });

  /**
   * Проверка на ошибку, которая уже случилась (Д1 карты v79).
   *
   * Разбор искал `from|import|require`, не требуя ни границы слова, ни скобок.
   * Из-за этого слово `import` внутри обычной строки — ключ перевода
   * `'accounts_import'` — считалось началом ввоза. Разбор сбивался с кавычек и
   * дальше по файлу читал мусор: файл маршрутов «терял» половину экранов, и
   * они попадали в сироты.
   *
   * Сорок два файла числились мёртвыми, не будучи мёртвыми.
   */
  it('слово «import» внутри строки не считается ввозом', () => {
    const sample = `
      import intl from 'react-intl-universal';
      export default [
        {
          path: '/accounts/import',
          component: lazy(() => import('@/containers/Accounts/AccountsImport')),
          breadcrumb: intl.get('accounts_import'),
        },
        {
          path: '/accounts',
          component: lazy(() => import('@/containers/Accounts/AccountsChart')),
          pageTitle: intl.get('accounts_chart'),
        },
      ];
    `;

    expect(importSpecifiers(sample)).toEqual([
      'react-intl-universal',
      '@/containers/Accounts/AccountsImport',
      '@/containers/Accounts/AccountsChart',
    ]);
  });

  it('ввоз ради побочного действия тоже виден', () => {
    expect(importSpecifiers("import '@/style/main.scss';")).toEqual([
      '@/style/main.scss',
    ]);
  });

  /**
   * Проверка на ошибку, которая уже случилась (Д1 карты v80).
   *
   * Сторож считал корнем только `spec`-файлы. Но поле `include` в
   * `vite.config.mts` берёт оба вида — и `test`, и `spec`. Тридцать один
   * проверочный файл числился сиротой, а с ними и то, что нужно только им.
   */
  it('проверочные файлы — корни, а не сироты', { timeout: 60_000 }, () => {
    const roots = rootFiles();
    const checks = roots.filter(isCheckFile);
    // Файлов вида `.test.` в витрине не один десяток; если корни снова
    // сузятся до `.spec.`, это число обвалится.
    expect(checks.filter((f) => /\.test\./.test(f)).length).toBeGreaterThan(20);
    expect(checks.filter((f) => /\.spec\./.test(f)).length).toBeGreaterThan(20);

    expect(orphanFiles().filter(isCheckFile)).toEqual([]);
  });

  /**
   * Истории Storybook собираются своей командой (`build-storybook`), и ввозить
   * их продукту незачем. Список папок читается из `.storybook/main.ts`, чтобы
   * не разойтись с ним при первой же новой папке.
   */
  it('истории Storybook — корни, а список папок берётся из настройки', () => {
    const roots = storyRoots();

    expect(roots).toContain('components/ui');
    expect(roots.length).toBeGreaterThanOrEqual(4);

    expect(
      isStoryFile(path.join(SRC, 'components', 'ui', 'alert.stories.tsx'), roots),
    ).toBe(true);
    // Папка вне настройки историей-корнем не считается.
    expect(
      isStoryFile(path.join(SRC, 'containers', 'Nope', 'x.stories.tsx'), roots),
    ).toBe(false);
  });

  it('файл подготовки прогона берётся из настройки и существует', () => {
    const setup = setupFiles();

    expect(setup.length).toBeGreaterThan(0);
    setup.forEach((f) => expect(fs.existsSync(f)).toBe(true));
  });

  // Объявления типов подключает `tsconfig`; ввоза для них не бывает.
  it('объявления .d.ts сиротами не считаются', { timeout: 60_000 }, () => {
    expect(orphanFiles().filter((f) => /\.d\.ts$/.test(f))).toEqual([]);
  });

  /**
   * Д2 карты v80. Сборка проверяет только то, что собирает сама, а истории в
   * CI не собираются. Удаление файла, нужного только истории, не поймала бы ни
   * одна проверка — поэтому ввозы проверяются отдельно.
   */
  it('внутренних ввозов в никуда нет', { timeout: 60_000 }, () => {
    expect(brokenImports()).toEqual([]);
  });

  it('закомментированный ввоз ввозом не считается', () => {
    const code = `
      // import { A } from "../../common/props";
      /* import { B } from './gone'; */
      import { C } from './here';
    `;

    expect(importSpecifiers(withoutComments(code))).toEqual(['./here']);
  });
});
