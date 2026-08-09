// © 2026 Bigfin
import { buildAnalysisLines, PlNode } from './buildAnalysisLines';

const node = (
  id: string,
  name: string,
  amount: number,
  children?: PlNode[],
  nodeType?: string,
): PlNode => ({ id, name, nodeType, total: { amount }, children });

describe('buildAnalysisLines', () => {
  it('возвращает раздел вместе с его статьями', () => {
    const lines = buildAnalysisLines([
      node('EXPENSES', 'Расходы', 100, [
        node('a1', 'Аренда', 30),
        node('a2', 'Зарплата', 70),
      ]),
    ]);

    expect(lines).toEqual([
      {
        key: 'EXPENSES',
        label: 'Расходы',
        amount: 100,
        level: 0,
        parentKey: null,
        isTotal: false,
      },
      {
        key: 'EXPENSES:a2',
        label: 'Зарплата',
        amount: 70,
        level: 1,
        parentKey: 'EXPENSES',
        isTotal: false,
      },
      {
        key: 'EXPENSES:a1',
        label: 'Аренда',
        amount: 30,
        level: 1,
        parentKey: 'EXPENSES',
        isTotal: false,
      },
    ]);
  });

  it('самая крупная статья идёт первой — она и съедает выручку', () => {
    const lines = buildAnalysisLines([
      node('EXPENSES', 'Расходы', 100, [
        node('a1', 'Мелочь', 5),
        node('a2', 'Аренда', 60),
        node('a3', 'Связь', 35),
      ]),
    ]);

    expect(lines.slice(1).map((l) => l.label)).toEqual([
      'Аренда',
      'Связь',
      'Мелочь',
    ]);
  });

  it('крупный минус тоже поднимается наверх — важна величина', () => {
    const lines = buildAnalysisLines([
      node('OTHER_INCOME', 'Прочие доходы', -90, [
        node('b1', 'Курсовые разницы', -90),
        node('b2', 'Прочее', 10),
      ]),
    ]);

    expect(lines.slice(1).map((l) => l.label)).toEqual([
      'Курсовые разницы',
      'Прочее',
    ]);
  });

  it('итоговые строки помечаются и не раскрываются', () => {
    const lines = buildAnalysisLines([
      node('GROSS_PROFIT', 'Валовая прибыль', 500, [
        node('x', 'не должно попасть', 1),
      ]),
      node('NET_INCOME', 'Чистая прибыль', 300),
    ]);

    expect(lines).toHaveLength(2);
    expect(lines.every((l) => l.isTotal)).toBe(true);
    expect(lines.map((l) => l.label)).toEqual([
      'Валовая прибыль',
      'Чистая прибыль',
    ]);
  });

  it('узел с типом AGGREGATE считается итоговым', () => {
    const lines = buildAnalysisLines([
      node('CUSTOM_TOTAL', 'Свой итог', 10, undefined, 'AGGREGATE'),
    ]);

    expect(lines[0].isTotal).toBe(true);
  });

  it('итоговая строка внутри раздела в статьи не попадает', () => {
    const lines = buildAnalysisLines([
      node('INCOME', 'Выручка', 100, [
        node('i1', 'Услуги', 100),
        node('NET_INCOME', 'Чистая прибыль', 50),
      ]),
    ]);

    expect(lines.map((l) => l.label)).toEqual(['Выручка', 'Услуги']);
  });

  it('раздел без статей остаётся одной строкой', () => {
    const lines = buildAnalysisLines([node('INCOME', 'Выручка', 100)]);

    expect(lines).toEqual([
      {
        key: 'INCOME',
        label: 'Выручка',
        amount: 100,
        level: 0,
        parentKey: null,
        isTotal: false,
      },
    ]);
  });

  it('пустой отчёт и мусор не роняют разбор', () => {
    expect(buildAnalysisLines([])).toEqual([]);
    expect(buildAnalysisLines(undefined as any)).toEqual([]);
    expect(
      buildAnalysisLines([{ id: 'X', name: 'Без сумм' } as any]),
    ).toEqual([
      {
        key: 'X',
        label: 'Без сумм',
        amount: 0,
        level: 0,
        parentKey: null,
        isTotal: false,
      },
    ]);
  });

  it('ключи статей уникальны даже при совпадении идентификаторов', () => {
    const lines = buildAnalysisLines([
      node('INCOME', 'Выручка', 10, [node('7', 'Счёт 7', 10)]),
      node('EXPENSES', 'Расходы', 10, [node('7', 'Счёт 7', 10)]),
    ]);
    const keys = lines.map((l) => l.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});
