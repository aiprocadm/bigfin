// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

import { activeCode } from '../../../testing/activeCode';
import {
  applyProjectScope,
  describeProjectScope,
  hasProjectScope,
} from './projectScope';

/**
 * Отбор отчёта по направлениям (остаток О6 ТЗ).
 *
 * ЧЕМ ОТЛИЧАЕТСЯ ОТ ЮРЛИЦА. Юрлицо — часть устройства группы: пустой выбор
 * означает «вся группа», и вдобавок надо исключать внутренние переводы, чтобы
 * не посчитать одни деньги дважды. Направление — просто ярлык: пустой выбор
 * означает «все операции», исключать нечего.
 *
 * Перепутать эти два правила легко, а последствия разные: лишнее исключение в
 * отчёте по направлениям молча урезало бы выручку.
 */
const fakeQuery = () => {
  const calls: Array<{ column: string; values: any[] }> = [];

  return {
    calls,
    whereIn(column: string, values: readonly any[]) {
      calls.push({ column, values: [...values] });
      return this;
    },
  };
};

describe('выбор направлений', () => {
  it('пустой выбор — не отбор', () => {
    expect(hasProjectScope(undefined)).toBe(false);
    expect(hasProjectScope({ projectsIds: [] })).toBe(false);
    expect(hasProjectScope({ projectsIds: null })).toBe(false);
  });

  it('выбранные направления — отбор', () => {
    expect(hasProjectScope({ projectsIds: [3] })).toBe(true);
  });
});

describe('наложение отбора', () => {
  it('без выбора запрос не трогается вовсе', () => {
    // Лишнее условие в запросе — это лишний план выполнения и лишний риск.
    const query = fakeQuery();

    applyProjectScope(query, { projectsIds: [] });

    expect(query.calls).toEqual([]);
  });

  it('с выбором отбирает по номерам направлений', () => {
    const query = fakeQuery();

    applyProjectScope(query, { projectsIds: [3, 5] });

    expect(query.calls).toEqual([{ column: 'project_id', values: [3, 5] }]);
  });

  it('номера приводятся к числам', () => {
    // Из адресной строки они приходят строками, и `whereIn` со строками
    // на числовой колонке отбирает не то.
    const query = fakeQuery();

    applyProjectScope(query, { projectsIds: ['3' as any] });

    expect(query.calls[0].values).toEqual([3]);
  });

  it('приставка колонки учитывается', () => {
    // При соединении таблиц MySQL не поймёт, о чьей колонке речь.
    const query = fakeQuery();

    applyProjectScope(query, { projectsIds: [3] }, 'accounts_transactions.');

    expect(query.calls[0].column).toBe('accounts_transactions.project_id');
  });

  it('ничего не исключает сверх выбранного', () => {
    // Главное отличие от юрлиц: перевод между направлениями — не двойной
    // счёт, а перекладывание внутри одного кармана.
    const query = fakeQuery();

    applyProjectScope(query, { projectsIds: [3] });

    expect(query.calls).toHaveLength(1);
  });
});

describe('пояснение для шапки', () => {
  it('без выбора отчёт не отобран', () => {
    expect(describeProjectScope(undefined)).toEqual({
      isFiltered: false,
      selectedCount: 0,
      excludesUnassigned: false,
    });
  });

  it('с выбором операции без направления выпадают', () => {
    // Человек спросил «сколько заработала розница», а не «розница плюс всё
    // непомеченное». Но знать об этом он должен: итог окажется меньше
    // общего, и причина неочевидна.
    expect(describeProjectScope({ projectsIds: [3] })).toEqual({
      isFiltered: true,
      selectedCount: 1,
      excludesUnassigned: true,
    });
  });
});

describe('отбор подключён во всех трёх отчётах', () => {
  const REPORTS = [
    ['Баланс', 'modules/BalanceSheet/BalanceSheetRepository.ts'],
    [
      'Прибыли и убытки',
      'modules/ProfitLossSheet/ProfitLossSheetRepository.ts',
    ],
    ['Движение денег', 'modules/CashFlowStatement/CashFlowRepository.ts'],
  ];

  const read = (file: string) =>
    activeCode(
      fs.readFileSync(
        path.resolve(__dirname, '../../FinancialStatements', file),
        'utf-8',
      ),
    );

  REPORTS.forEach(([name, file]) => {
    it(`${name}: зовёт общий отбор`, () => {
      // Забытый отчёт не падает: он показывает всё подряд там, где человек
      // выбрал одно направление.
      expect(read(file)).toContain('applyProjectScope(');
    });
  });
});
