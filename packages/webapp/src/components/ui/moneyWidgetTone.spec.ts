import { describe, expect, it } from 'vitest';

import { accountGapTone, gapHasStarted } from './money-widget';

/**
 * Состояние счёта в виджете денег (FIN-007 ТЗ-2).
 *
 * Цвет здесь — это срочность, а не украшение. Ошибись он в одну сторону —
 * человек не успеет перекинуть деньги; ошибись в другую — привыкнет к
 * красному и перестанет его замечать.
 */
const TODAY = '2026-09-20';

describe('срочность разрыва по счёту', () => {
  it('без разрывов счёт спокоен', () => {
    expect(accountGapTone([], TODAY)).toBe('success');
    expect(accountGapTone(undefined, TODAY)).toBe('success');
  });

  it('разрыв дальше двух недель — предупреждение, а не авария', () => {
    // Две недели — столько нужно, чтобы занять, передвинуть платёж или
    // поторопить должника. Красный здесь кричал бы о том, что ещё поправимо.
    expect(accountGapTone([{ from: '2026-10-20' }], TODAY)).toBe('warning');
  });

  it('разрыв ближе двух недель — красный', () => {
    expect(accountGapTone([{ from: '2026-09-25' }], TODAY)).toBe('danger');
  });

  it('разрыв, который УЖЕ начался, — красный, а не предупреждение', () => {
    // Это не прогноз, а факт: деньги на счёте уже в минусе.
    expect(accountGapTone([{ from: '2026-09-01' }], TODAY)).toBe('danger');
    expect(gapHasStarted({ from: '2026-09-01' }, TODAY)).toBe(true);
  });

  it('разрыв ровно сегодня считается начавшимся', () => {
    // Граница именно здесь: «сегодня не хватит» — это уже случилось.
    expect(gapHasStarted({ from: TODAY }, TODAY)).toBe(true);
    expect(accountGapTone([{ from: TODAY }], TODAY)).toBe('danger');
  });

  it('ровно через 14 дней — ещё красный, через 15 — жёлтый', () => {
    // Граница проверяется явно: сдвинься она на день, счёт с разрывом
    // послезавтра выглядел бы спокойным.
    expect(accountGapTone([{ from: '2026-10-04' }], TODAY)).toBe('danger');
    expect(accountGapTone([{ from: '2026-10-05' }], TODAY)).toBe('warning');
  });

  it('срочность считается по БЛИЖАЙШЕМУ разрыву', () => {
    const tone = accountGapTone(
      [{ from: '2026-09-22' }, { from: '2026-12-01' }],
      TODAY,
    );

    expect(tone).toBe('danger');
  });
});
