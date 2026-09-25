import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Р2 карты v26. Деньги печатает одна утилита на весь продукт.
 *
 * Четыре экрана — анализ НДС, маркетплейсы, эквайринг, МойСклад — завели
 * себе по маленькому форматтеру:
 *
 *   const money = (v) =>
 *     new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(v);
 *
 * Он печатает `45 000` — без знака валюты и без копеек, тогда как весь
 * остальной продукт показывает `45 000,00 ₽`. В разделе про НДС «45 000»
 * читается как «сорок пять тысяч чего?».
 *
 * Правило: суммы печатает `formattedAmount` — она знает про валюту
 * организации. Собственный `Intl.NumberFormat` допустим для НЕденежных
 * величин (проценты, количества, коэффициенты) — такие места перечислены
 * явно, чтобы проверка оставалась понятной.
 */
const SRC = path.resolve(__dirname, '..');

/** Места, где число — не деньги, и своя разметка уместна. */
const ALLOWED = [
  // Общая утилита денег — она и есть то самое единственное место.
  'utils/index.tsx',
  // Проценты и коэффициенты.
  'containers/FinancialRatios/FinancialRatiosPage.tsx',
  // Форматирование величин в списках: количество, проценты, доли.
  'components/ui/list-view/list-format.ts',
  // `components/Dashboard/DashboardSummary.tsx` удалён в этапе 46 ТЗ-4
  // (UI-046-4, решение владельца): его не рисовал ни один экран.
];

/**
 * Места, где знак валюты или локаль вписаны руками осознанно.
 * Список может только уменьшаться.
 */
const ALLOWED_HARDCODED = [
  // Общая утилита денег: она и есть то самое единственное место, где
  // знак валюты появляется.
  'utils/index.tsx',
  // Сетка бюджета — ПОЛЯ ВВОДА: человек вписывает суммы руками, знак
  // валюты в поле мешал бы вводу. Итоги в тех же столбцах печатаются
  // так же, чтобы колонка читалась одинаково.
  'containers/Budgets/budgetFormatters.ts',
  'containers/Budgets/BudgetGrid.tsx',
];

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (/\.spec\.tsx?$/.test(entry.name)) return [];
    return [full];
  });

describe('формат денег', () => {
  const files = sourceFiles(SRC);

  it('исходники витрины читаются', () => {
    // Иначе проверка ниже стала бы пустой и зелёной.
    expect(files.length).toBeGreaterThan(100);
  });

  it('деньги не форматируются в обход общей утилиты', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      const relative = path.relative(SRC, file);
      if (ALLOWED.includes(relative)) return;

      // Комментарии не считаем: они как раз объясняют, почему так делать
      // нельзя, и упоминают запрещённое по имени.
      const code = fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n');

      // Ищем именно денежные помощники: переменная с говорящим именем.
      if (!/\b(money|amountFormat|formatMoney)\b\s*=/.test(code)) return;
      if (!/Intl\.NumberFormat/.test(code)) return;

      offenders.push(relative);
    });

    expect(offenders).toEqual([]);
  });

  /**
   * Э1 карты v31. Ловим правило по существу, а не по именам.
   *
   * Проверка выше искала помощников с говорящими именами (`money`,
   * `amountFormat`, `formatMoney`). В десяти новых разделах их назвали
   * `fmt` — и она прошла мимо двадцати одного места вида
   *
   *   const fmt = (n) => `${(n ?? 0).toLocaleString('ru-RU')} ₽`;
   *
   * которые теряют копейки, зашивают рубль мимо валюты организации и
   * зашивают русскую локаль. Признак надёжнее имени: знак валюты или
   * локаль, вписанные руками.
   */
  it('знак валюты и локаль не вписываются в код руками', () => {
    const offenders: string[] = [];

    files.forEach((file) => {
      const relative = path.relative(SRC, file);
      if (ALLOWED_HARDCODED.includes(relative)) return;

      const code = fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n');

      // Ловим СБОРКУ строки на ходу: `${…} ₽`. Готовая строка-образец
      // («1000,00 ₽» как значение по умолчанию в предпросмотре шаблона) —
      // не печатник и никого не обманывает.
      const buildsMoney = /\$\{[^}]*\}[^`'"]{0,4}₽/.test(code);
      const hardcodedLocale = /toLocaleString\(\s*['"]ru-RU['"]/.test(code);

      if (buildsMoney || hardcodedLocale) offenders.push(relative);
    });

    expect(offenders).toEqual([]);
  });
});
