import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * Разрез отчёта по направлениям (остаток О6 ТЗ).
 *
 * ЗАЧЕМ СТОРОЖ. Сервер отбирать по направлению научился, но человек попадает
 * к этому отбору только через поле в панели настроек. Забытый отчёт не падает
 * — он просто показывает всё подряд там, где выбрано одно направление, и
 * заметить это можно только сложив числа руками.
 */
const read = (file: string) =>
  activeCode(fs.readFileSync(path.join(__dirname, file), 'utf8'));

const HEADERS = [
  ['Баланс', 'BalanceSheet/v2/BalanceSheetHeaderV2.tsx'],
  ['Движение денег', 'CashFlowStatement/v2/CashFlowStatementHeaderV2.tsx'],
  ['Прибыли и убытки', 'ProfitLossSheet/v2/ProfitLossHeaderV2.tsx'],
];

describe('отбор по направлению доступен во всех отчётах', () => {
  HEADERS.forEach(([name, file]) => {
    it(`${name}: поле выведено в панели настроек`, () => {
      expect(read(file)).toContain('<ReportDirectionsField />');
    });
  });

  it('проверка и правда читает шапки', () => {
    HEADERS.forEach(([, file]) => {
      expect(read(file).length).toBeGreaterThan(1000);
    });
  });
});

describe('правила поля направлений', () => {
  const field = read('v2/FinancialHeaderDirectionsField.tsx');

  it('поля нет, пока направление одно', () => {
    // Выбор из одного — не выбор, а лишний вопрос без ответа.
    expect(field).toContain('shouldShowDirectionBreakdown');
    expect(field).toContain('return null');
  });

  it('правило показа взято общее, а не написано заново', () => {
    // Вторая копия однажды разойдётся с первой, и поле вылезет там, где
    // направление одно.
    expect(field).toContain("from '@/containers/Directions/directionView'");
  });

  it('убранные направления не предлагаются', () => {
    // На них больше не относят новые операции; старые видны через «все».
    expect(field).toContain('isDirectionActive');
  });

  it('человеку сказано, что операции без направления выпадают', () => {
    // Иначе итог отчёта окажется меньше общего без видимой причины.
    expect(field).toContain('report.directions.hint');
  });

  it('поле кладёт выбор туда, куда его ждёт сервер', () => {
    // Имя поля — часть договора с сервером: опечатка молча отключает отбор.
    expect(field).toContain("'projectsIds'");
  });
});
