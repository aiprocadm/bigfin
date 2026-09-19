import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * Пояснение о разрезе в шапке отчёта (этап 7 ТЗ).
 *
 * ЗАЧЕМ СТОРОЖ. Сервер считал это пояснение с самого начала, а на экран его
 * никто не выводил — оно существовало только в ответе. Сводный отчёт и отчёт
 * по одному юрлицу дают РАЗНЫЕ числа, и оба правильные; без подписи человек
 * решает, что программа врёт.
 *
 * Отдельно — честная оговорка про баланс. ЖИВАЯ ПРОВЕРКА НА СТЕНДЕ показала:
 * перевод 500 000 между двумя юрлицами группы разводит стороны баланса ОДНОГО
 * юрлица ровно на 500 000. Сводный баланс при этом сходится. Причина в том,
 * что расчётов внутри группы продукт пока не ведёт, и встречного требования к
 * своему же юрлицу в балансе нет. Пока этого нет — про это надо говорить.
 */
const read = (file: string) =>
  activeCode(fs.readFileSync(path.join(__dirname, file), 'utf8'));

const TABLES = [
  ['Баланс', 'BalanceSheet/BalanceSheetTable.tsx'],
  ['Прибыли и убытки', 'ProfitLossSheet/ProfitLossSheetTable.tsx'],
  ['Движение денег', 'CashFlowStatement/CashFlowStatementTable.tsx'],
];

describe('шапка отчёта говорит, что показано', () => {
  TABLES.forEach(([name, file]) => {
    it(`${name}: пояснение выводится`, () => {
      expect(read(file)).toContain('<ReportScopeNote');
    });

    it(`${name}: берёт разрез из ответа сервера`, () => {
      // Считать его заново на витрине значило бы завести второе правило,
      // которое однажды разойдётся с серверным.
      expect(read(file)).toContain('legal_entity_scope');
    });
  });

  it('оговорка про баланс — только у Баланса', () => {
    // У ОПиУ и ДДС сторон нет, сходиться нечему; лишняя оговорка там только
    // пугает.
    expect(read('BalanceSheet/BalanceSheetTable.tsx')).toContain(
      'withBalanceWarning',
    );
    expect(read('ProfitLossSheet/ProfitLossSheetTable.tsx')).not.toContain(
      'withBalanceWarning',
    );
    expect(read('CashFlowStatement/CashFlowStatementTable.tsx')).not.toContain(
      'withBalanceWarning',
    );
  });

  it('при одном юрлице в организации подпись не появляется', () => {
    // Выбора не было — говорить не о чем.
    const note = read('ReportScopeNote.tsx');

    expect(note).toContain('selectedCount');
    expect(note).toContain('return null');
  });

  it('проверка и правда читает файлы', () => {
    TABLES.forEach(([, file]) => {
      expect(read(file).length).toBeGreaterThan(1000);
    });
  });
});
