import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * Сравнение с прошлым периодом в шапке Движения денег (остаток О3 ТЗ).
 *
 * ЗАЧЕМ СТОРОЖ. Сервер считать сравнение научился, но человек попадает к нему
 * только через выключатель в панели настроек. Забытый выключатель выглядит
 * совершенно нормально: отчёт открывается, числа на месте, просто сравнения
 * нет — и никто не догадается, что оно вообще существует.
 */
const read = (file: string) =>
  activeCode(fs.readFileSync(path.join(__dirname, file), 'utf8'));

describe('сравнение с прошлым периодом доступно в ДДС', () => {
  const header = read(
    'CashFlowStatement/v2/CashFlowStatementHeaderV2.tsx',
  );
  const schema = read(
    'CashFlowStatement/v2/CashFlowStatementHeader.zod.ts',
  );
  const fields = read('v2/FinancialHeaderPreviousPeriodFields.tsx');

  it('выключатели выведены в панели настроек', () => {
    expect(header).toContain('<ReportPreviousPeriodFields />');
  });

  it('схема формы знает все три поля', () => {
    // Поле, которого нет в схеме, молча не доедет до запроса.
    ['previousPeriod', 'previousPeriodAmountChange', 'previousPeriodPercentageChange'].forEach(
      (field) => {
        expect(schema).toContain(field);
      },
    );
  });

  it('умолчания формы берутся из запроса отчёта', () => {
    // Иначе выбор человека сбрасывался бы при каждом открытии панели.
    expect(header).toContain('Boolean(pageFilter.previousPeriod)');
  });

  it('снятие родителя снимает дочерние', () => {
    // Изменение к периоду, которого на экране нет, читать не с чем.
    expect(fields).toContain("set('previousPeriodAmountChange', false)");
    expect(fields).toContain("set('previousPeriodPercentageChange', false)");
  });

  it('включение дочернего включает родителя', () => {
    expect(fields).toContain("if (checked) set('previousPeriod', true)");
  });

  it('правило связи то же, что в Балансе', () => {
    // Человек не должен заново разбираться в настройках, переходя между
    // отчётами.
    const balance = read('BalanceSheet/v2/BalanceSheetHeaderV2.tsx');

    expect(balance).toContain("setValue('previousPeriodAmountChange', false)");
  });

  it('проверка и правда читает файлы', () => {
    expect(header.length).toBeGreaterThan(1000);
    expect(fields.length).toBeGreaterThan(500);
  });
});
