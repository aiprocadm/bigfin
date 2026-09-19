import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * Валюта группы доехала до экрана (§7.4, остаток К4).
 *
 * СТОРОЖ ИМЕННО ЭТОГО ВИДА. Сервер уже считал разрез по юрлицам — и никто его
 * не выводил: возможность существовала только в ответе. Ровно та же дорожка у
 * валюты: посчитать в шапке легко, забыть передать — ещё легче.
 *
 * Подпись нужна ВСЕМ ТРЁМ отчётам: суммы в них складываются одинаково, и
 * отчёт без подписи рядом с отчётом с подписью выглядит как ошибка.
 */
const read = (file: string) =>
  activeCode(fs.readFileSync(path.join(__dirname, file), 'utf8'));

const TABLES = [
  ['Баланс', 'BalanceSheet/BalanceSheetTable.tsx'],
  ['Прибыли и убытки', 'ProfitLossSheet/ProfitLossSheetTable.tsx'],
  ['Движение денег', 'CashFlowStatement/CashFlowStatementTable.tsx'],
];

describe('валюта группы в шапке отчёта', () => {
  TABLES.forEach(([name, file]) => {
    it(`${name}: валюта передана из ответа сервера`, () => {
      // Считать её заново на витрине значило бы завести второе правило,
      // которое однажды разойдётся с серверным.
      expect(read(file)).toContain('group_currency');
    });
  });

  it('подпись показывается ТОЛЬКО при разных валютах', () => {
    // Пока валюта одна, «суммы в рублях» — это шум, который человек
    // перестаёт читать, а вместе с ним и всё остальное в шапке.
    const note = read('ReportScopeNote.tsx');

    expect(note).toContain('isMultiCurrency');
    expect(note).toContain('report.scope.group_currency');
  });

  it('подпись выживает без разреза по юрлицам', () => {
    // Шапка раньше выходила из работы сразу, если разреза нет. Валюта от
    // разреза не зависит: группа может быть многовалютной и без выбора
    // юрлица.
    const note = read('ReportScopeNote.tsx');

    expect(note).toContain('if (!scope) return showCurrency');
  });

  it('проверка и правда читает файлы', () => {
    TABLES.forEach(([, file]) => {
      expect(read(file).length).toBeGreaterThan(1000);
    });
  });
});
