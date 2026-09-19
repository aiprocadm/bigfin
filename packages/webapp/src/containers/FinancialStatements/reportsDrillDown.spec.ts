import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';
import {
  drillDownAccountId,
  reportDrillDownRange,
} from './reportDrillDownRange';

/**
 * Сторож: раскрытие суммы подключено во ВСЕХ трёх главных отчётах.
 *
 * ЗАЧЕМ. ТЗ называет раскрытие суммы ключевым дословно: «без него пользователь
 * не доверяет цифрам и уходит обратно в Excel». Отчёт, где по строке нельзя
 * щёлкнуть, выглядит совершенно нормально — просто ничего не происходит.
 * Заметить это можно только рукой, на живом экране.
 *
 * Так и было: раскрытие работало (точнее, должно было работать) только в ОПиУ,
 * а Баланс и Движение денег молчали.
 */
const TABLES = [
  {
    name: 'Прибыли и убытки',
    file: 'ProfitLossSheet/ProfitLossSheetTable.tsx',
    kind: 'turnover',
  },
  {
    name: 'Баланс',
    file: 'BalanceSheet/BalanceSheetTable.tsx',
    kind: 'balance',
  },
  {
    name: 'Движение денег',
    file: 'CashFlowStatement/CashFlowStatementTable.tsx',
    kind: 'balance',
  },
];

const source = (file: string) =>
  activeCode(fs.readFileSync(path.join(__dirname, file), 'utf8'));

describe('раскрытие суммы подключено во всех отчётах', () => {
  TABLES.forEach((table) => {
    it(`${table.name}: по строке можно щёлкнуть`, () => {
      expect(source(table.file)).toContain('canDrillDown=');
    });

    it(`${table.name}: панель раскрытия и правда выводится`, () => {
      // Обработчик без панели — это клик в пустоту.
      expect(source(table.file)).toContain('<ReportDrillDownPanel');
    });
  });

  it('Баланс и Движение денег показывают цепочку остатков', () => {
    // Их строка — ОСТАТОК на дату. Один только итог операций с ней не
    // сойдётся никогда, и человек решит, что отчёт врёт.
    ['BalanceSheet/BalanceSheetTable.tsx', 'CashFlowStatement/CashFlowStatementTable.tsx'].forEach(
      (file) => {
        expect(source(file)).toContain('kind="balance"');
      },
    );
  });

  it('ОПиУ остаётся оборотным — цепочка остатков ему не нужна', () => {
    // Строка ОПиУ это оборот за период; остаток на начало там бессмыслен.
    expect(source('ProfitLossSheet/ProfitLossSheetTable.tsx')).not.toContain(
      'kind="balance"',
    );
  });

  it('проверка и правда читает файлы отчётов', () => {
    TABLES.forEach((table) => {
      expect(source(table.file).length).toBeGreaterThan(1000);
    });
  });
});

describe('номер счёта строки отчёта', () => {
  it('в ОПиУ и Балансе номер числовой', () => {
    expect(drillDownAccountId(1025)).toBe(1025);
    expect(drillDownAccountId('1025')).toBe(1025);
  });

  it('в Движении денег приставка снимается', () => {
    // Без этого раскрытие в ДДС не заработало бы вовсе: `Number('account-5')`
    // это NaN, и строка всегда считалась бы нераскрываемой.
    expect(drillDownAccountId('account-1025')).toBe(1025);
  });

  it('у итогов и расчётных строк раскрывать нечего', () => {
    ['INCOME', 'NET_INCOME', 'CASH_END_PERIOD', '', null, undefined, 0, -3].forEach(
      (value) => {
        expect(drillDownAccountId(value)).toBeNull();
      },
    );
  });
});

describe('период отчёта читается в обоих написаниях', () => {
  it('ключи через подчёркивание — из ответа сервера', () => {
    expect(
      reportDrillDownRange({ from_date: '2026-01-01', to_date: '2026-03-31' }),
    ).toEqual({ fromDate: '2026-01-01', toDate: '2026-03-31' });
  });

  it('ключи слитно — из собственного запроса отчёта', () => {
    expect(
      reportDrillDownRange({ fromDate: '2026-01-01', toDate: '2026-03-31' }),
    ).toEqual({ fromDate: '2026-01-01', toDate: '2026-03-31' });
  });

  it('пустой запрос не роняет панель', () => {
    // Пустые даты — это пустой список, а не падение экрана.
    expect(reportDrillDownRange(undefined)).toEqual({
      fromDate: '',
      toDate: '',
    });
  });
});
