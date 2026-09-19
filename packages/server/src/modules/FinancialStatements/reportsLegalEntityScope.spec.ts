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
