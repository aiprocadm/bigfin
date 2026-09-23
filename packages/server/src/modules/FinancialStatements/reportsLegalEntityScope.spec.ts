// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { activeCode } from '../../testing/activeCode';

/**
 * Сторож: разрез по юрлицу наложен во ВСЕХ трёх отчётах.
 *
 * ЗАЧЕМ. Отбор, забытый хотя бы в одном отчёте, не падает и не выглядит
 * ошибкой: отчёт просто показывает цифры по всей группе там, где человек
 * выбрал одно юрлицо. Заметить это можно, только сложив числа руками.
 *
 * Хуже того, отчёты тогда расходятся между собой: Баланс показывает одно
 * юрлицо, ОПиУ — всю группу, и оба выглядят правильными.
 *
 * Каждый отчёт накладывает отбор в ОДНОМ месте на все свои запросы: Баланс
 * собирается несколькими запросами (обороты, остатки на начало, периоды),
 * ДДС — четырьмя. Поэтому сторож проверяет само это общее место.
 */
const REPORTS = [
  {
    name: 'Баланс',
    file: 'modules/BalanceSheet/BalanceSheetRepository.ts',
  },
  {
    name: 'Прибыли и убытки',
    file: 'modules/ProfitLossSheet/ProfitLossSheetRepository.ts',
  },
  {
    name: 'Движение денег',
    file: 'modules/CashFlowStatement/CashFlowRepository.ts',
  },
];

const ROOT = __dirname;

const source = (file: string) =>
  activeCode(fs.readFileSync(path.join(ROOT, file), 'utf-8'));

describe('разрез по юрлицу наложен во всех отчётах', () => {
  REPORTS.forEach((report) => {
    it(`${report.name}: зовёт общий отбор по юрлицу`, () => {
      expect(source(report.file)).toContain('applyLegalEntityScope(');
    });

    it(`${report.name}: отбор стоит в ОБЩЕМ месте, а не в одном запросе`, () => {
      // Общее место — `commonFilterBranchesQuery`: его зовут все запросы
      // отчёта. Отбор, поставленный в один запрос, отчёт рассогласует.
      const text = source(report.file);
      const common = text.slice(text.indexOf('commonFilterBranchesQuery ='));

      expect(common).toContain('applyLegalEntityScope(');
    });
  });

  it('шапка отчёта говорит, что именно показано', () => {
    // Сводный отчёт без внутренних переводов и отчёт по одному юрлицу дают
    // разные числа, и оба правильные. Человек должен видеть, какой перед ним.
    const metas = [
      'modules/BalanceSheet/BalanceSheetMeta.ts',
      'modules/ProfitLossSheet/ProfitLossSheetMeta.ts',
      'modules/CashFlowStatement/CashflowSheetMeta.ts',
    ];

    metas.forEach((file) => {
      expect(source(file)).toContain('describeLegalEntityScope(');
    });
  });

  it('проверка и правда читает файлы отчётов', () => {
    // Без этого сторож мог бы «проходить» на пустых строках.
    REPORTS.forEach((report) => {
      expect(source(report.file).length).toBeGreaterThan(1000);
    });
  });
});

/**
 * Управленческие отчёты (FT-008 ТЗ-3).
 *
 * ЧТО БЫЛО. Три службы ниже принимали номера юрлиц — и выбрасывали их. Этот
 * сторож охранял только бухгалтерские отчёты, поэтому дыра прожила с этапа 7
 * ТЗ-1 до аудита ТЗ-3: «Деньги по статьям», план-факт бюджета, рентабельность
 * сделок и точка безубыточности считались по всей группе.
 *
 * ПОЧЕМУ СЧЁТ, А НЕ «ВЫЗОВ ЕСТЬ В ФАЙЛЕ». У «Денег по статьям» два запроса к
 * проводкам: остатки и переводы. Отбор, поставленный в один из них, файл
 * проверку «вызов есть» пройдёт, а отчёт при выбранном юрлице разойдётся сам
 * с собой — статьи по одному юрлицу, остатки по всей группе. Поэтому каждый
 * запрос к проводкам обязан иметь свой отбор: запросов столько же, сколько
 * отборов.
 */
const MANAGEMENT = [
  {
    name: 'Свёртка ОПиУ по статьям',
    file: '../ManagementArticles/queries/ArticlesPlRollup.service.ts',
  },
  {
    name: 'Кассовая свёртка по статьям',
    file: '../ManagementArticles/queries/ArticlesCashflowRollup.service.ts',
  },
  {
    name: 'Отчёт «Деньги по статьям»',
    file: 'modules/CashFlowArticles/CashFlowArticlesService.ts',
  },
  {
    name: 'Управленческий ОПиУ (FT-010)',
    file: 'modules/ManagerialProfitLoss/ManagerialPnlSource.service.ts',
  },
];

const SCOPE_HELPER = '../ManagementArticles/utils/managementReportScope.ts';

const occurrences = (text: string, needle: string) =>
  text.split(needle).length - 1;

/** Сколько запросов к проводкам в коде идут мимо общего отбора. */
function unscopedTransactionQueries(code: string): number {
  return (
    occurrences(code, 'accountTransactionModel()') -
    occurrences(code, 'applyManagementReportScope(')
  );
}

describe('разрез по юрлицу наложен в управленческих отчётах', () => {
  it('общий отбор управленческих отчётов зовёт отбор по юрлицу', () => {
    expect(source(SCOPE_HELPER)).toContain('applyLegalEntityScope(');
  });

  MANAGEMENT.forEach((report) => {
    it(`${report.name}: каждый запрос к проводкам идёт через общий отбор`, () => {
      const code = source(report.file);

      expect(occurrences(code, 'accountTransactionModel()')).toBeGreaterThan(0);
      expect(unscopedTransactionQueries(code)).toBe(0);
    });
  });

  it('сторож и правда замечает запрос без отбора', () => {
    // Мутация: убираем один отбор из настоящего файла. Сторож, который этого
    // не замечает, — декорация.
    const code = source('modules/CashFlowArticles/CashFlowArticlesService.ts');
    const mutated = code.replace('applyManagementReportScope(', 'noop(');

    expect(mutated).not.toBe(code);
    expect(unscopedTransactionQueries(mutated)).toBe(1);
  });
});
