// © 2026 Bigfin
import { readBalanceTotals } from '@/modules/Capitalization/utils/readBalanceTotals';

import { CONVERGENCE_TOLERANCE } from './fixtures';

/**
 * Инвариант 2 раздела 11.10 ТЗ-2: `Активы = Обязательства + Капитал`.
 *
 * Это основа двойной записи. Её нарушение перекашивает весь баланс ровно на
 * разницу и обесценивает каждый отчёт, который из него растёт, — от оценки
 * стоимости бизнеса до финансовых показателей.
 *
 * Узлы читает ЖИВАЯ функция продукта (`readBalanceTotals`): именно ею
 * пользуется оценка стоимости, и если она однажды перестанет находить
 * «Обязательства» внутри «Обязательств и капитала», оценка молча станет
 * равной всем активам.
 */
const node = (id: string, amount: number, children: any[] = []) => ({
  id,
  total: { amount },
  children,
});

/** Баланс с копейками: на круглых тысячах ошибка округления прячется. */
const balanceTree = (assets: number, liabilities: number, equity: number) => [
  node('ASSETS', assets, [
    node('CURRENT_ASSETS', assets * 0.6),
    node('FIXED_ASSETS', assets * 0.4),
  ]),
  node('LIABILITY_EQUITY', liabilities + equity, [
    node('LIABILITY', liabilities),
    node('EQUITY', equity),
  ]),
];

/** Капитал читается тем же обходом, что и остальные узлы отчёта. */
const equityOf = (nodes: any[]): number => {
  const half = nodes.find((n) => n.id === 'LIABILITY_EQUITY');
  const equity = (half?.children ?? []).find((n: any) => n.id === 'EQUITY');

  return Number(equity?.total?.amount ?? 0);
};

describe('сходимость баланса', () => {
  it('АКТИВЫ = ОБЯЗАТЕЛЬСТВА + КАПИТАЛ', () => {
    const nodes = balanceTree(1_245_200.53, 345_100.28, 900_100.25);
    const totals = readBalanceTotals(nodes);

    expect(totals.found).toBe(true);

    const difference = Math.abs(
      totals.assets - (totals.liabilities + equityOf(nodes)),
    );

    expect(difference).toBeLessThanOrEqual(CONVERGENCE_TOLERANCE);
  });

  it('обязательства берутся из ВЛОЖЕННОГО узла, а не с верхнего уровня', () => {
    // Плоский поиск вернул бы ноль, и оценка стоимости молча получилась бы
    // равной всем активам.
    const totals = readBalanceTotals(
      balanceTree(1_000_000.11, 250_000.05, 750_000.06),
    );

    expect(totals.liabilities).toBe(250_000.05);
  });

  it('узлов нет — говорим прямо, а не считаем нулями', () => {
    const totals = readBalanceTotals([]);

    expect(totals.found).toBe(false);
  });

  it('проверка ловит подделку', () => {
    // Мутация: перекошенный баланс обязан не сойтись.
    const nodes = balanceTree(1_000_000, 250_000, 740_000);
    const totals = readBalanceTotals(nodes);

    expect(
      Math.abs(totals.assets - (totals.liabilities + equityOf(nodes))),
    ).toBeGreaterThan(CONVERGENCE_TOLERANCE);
  });
});
