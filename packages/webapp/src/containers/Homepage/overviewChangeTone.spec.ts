import { describe, expect, it } from 'vitest';

import { isGoodChange } from './OverviewSection';

/**
 * Хорошая ли новость это изменение показателя.
 *
 * Раньше рост красился зелёным ВСЕГДА: рост расходов на 20% выглядел хорошей
 * новостью, а их снижение — плохой. Ошибка незаметная: цвет не врёт грубо, он
 * просто хвалит не за то.
 */
describe('isGoodChange', () => {
  it('рост доходов — хорошо', () => {
    expect(isGoodChange('income', 20)).toBe(true);
  });

  it('падение доходов — не хорошо', () => {
    expect(isGoodChange('income', -20)).toBe(false);
  });

  it('РОСТ РАСХОДОВ — НЕ ХОРОШО', () => {
    // Красить его зелёным значит поздравлять человека с тем, что он стал
    // больше тратить.
    expect(isGoodChange('expense', 20)).toBe(false);
  });

  it('снижение расходов — хорошо', () => {
    expect(isGoodChange('expense', -20)).toBe(true);
  });

  it('без вида показателя рост считается хорошим', () => {
    // Прибыль и остаток идут без пометки: у них рост и правда хорош.
    expect(isGoodChange(undefined, 5)).toBe(true);
    expect(isGoodChange(undefined, -5)).toBe(false);
  });

  it('ноль — не падение', () => {
    // «Столько же, сколько в прошлом месяце» — это не плохая новость.
    expect(isGoodChange('income', 0)).toBe(true);
    expect(isGoodChange(undefined, 0)).toBe(true);
  });

  it('нулевой рост расходов — тоже не плохая новость', () => {
    // Но и не хорошая: расходы не снизились. Зелёным не отмечаем.
    expect(isGoodChange('expense', 0)).toBe(false);
  });
});
