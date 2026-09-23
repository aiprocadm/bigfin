// © 2026 Bigfin
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import ru from '@/lang/ru/index.json';
import en from '@/lang/en/index.json';
import { formulaKeyOf, REPORT_FORMULA_ROWS } from './reportFormulas';

/**
 * Сторож: у каждой расчётной строки отчёта есть подсказка-формула (FT-016
 * ТЗ-3).
 *
 * Итоги ярусов строит СЕРВЕР, а подсказки показывает витрина. Сторож читает
 * серверный построитель и требует, чтобы каждый итог и каждая строка
 * рентабельности были в списке подсказок, а у каждой подсказки был текст на
 * обоих языках. Новый ярус без подсказки — красная проверка.
 */
const SERVER = path.resolve(__dirname, '../../../../server/src/modules/FinancialStatements/modules');
const read = (file: string) => fs.readFileSync(path.join(SERVER, file), 'utf8');

/** Итоги и рентабельности, которые строит сервер: `totalRow('md')`, `marginRow('md')`. */
export function serverFormulaRows(source: string): string[] {
  const ids: string[] = [];
  for (const match of source.matchAll(/totalRow\('(\w+)'\)/g)) ids.push(match[1]);
  for (const match of source.matchAll(/marginRow\('(\w+)'\)/g)) ids.push(`${match[1]}_margin`);
  return [...new Set(ids)];
}

describe('подсказки-формулы у расчётных строк', () => {
  const pnlSource = read('ManagerialProfitLoss/buildManagerialPnlReport.ts');
  const fromServer = serverFormulaRows(pnlSource);

  it('сервер и правда строит итоги (иначе проверка была бы пустой)', () => {
    expect(fromServer.length).toBeGreaterThanOrEqual(10);
  });

  it('каждый итог и каждая рентабельность ОПиУ — в списке подсказок', () => {
    const listed = new Set<string>(REPORT_FORMULA_ROWS.managerialPnl);
    expect(fromServer.filter((id) => !listed.has(id))).toEqual([]);
  });

  it('расчётные строки «Денег» существуют на сервере', () => {
    const table = read('CashFlowArticles/CashFlowArticlesTable.ts');
    REPORT_FORMULA_ROWS.cashFlowArticles.forEach((id) => {
      expect(table).toContain(`'${id}'`);
    });
  });

  it('у каждой подсказки есть текст на русском и английском', () => {
    const missing: string[] = [];
    [...REPORT_FORMULA_ROWS.managerialPnl, ...REPORT_FORMULA_ROWS.cashFlowArticles].forEach(
      (id) => {
        const key = formulaKeyOf(id);
        if (!(ru as any)[key]) missing.push(`ru:${key}`);
        if (!(en as any)[key]) missing.push(`en:${key}`);
      },
    );
    expect(missing).toEqual([]);
  });

  it('критерий FT-016: подсказка ВП1 содержит формулу дословно', () => {
    expect((ru as any)['reports.formula.gp1']).toContain(
      'ВП1 = Выручка − Прямые переменные − Прямые производственные',
    );
  });

  it('проверка умеет найти новый ярус без подсказки', () => {
    // Сторож без самопроверки может оказаться зелёным просто потому, что
    // ничего не находит.
    const mutated = `${pnlSource}\n totalRow('ebitda2'); marginRow('ebitda2');`;
    const listed = new Set<string>(REPORT_FORMULA_ROWS.managerialPnl);

    expect(serverFormulaRows(mutated).filter((id) => !listed.has(id))).toEqual([
      'ebitda2',
      'ebitda2_margin',
    ]);
  });
});
