import { describe, expect, it } from 'vitest';

import { matchPreset, normalizeRange, presetRange, shiftRange } from './date-range';

const TODAY = '2026-09-24'; // четверг

describe('готовые периоды', () => {
  it.each([
    ['today', '2026-09-24', '2026-09-24'],
    ['this_week', '2026-09-21', '2026-09-27'],
    ['this_month', '2026-09-01', '2026-09-30'],
    ['last_month', '2026-08-01', '2026-08-31'],
    ['this_quarter', '2026-07-01', '2026-09-30'],
    ['last_quarter', '2026-04-01', '2026-06-30'],
    ['this_year', '2026-01-01', '2026-12-31'],
    ['last_year', '2025-01-01', '2025-12-31'],
  ] as const)('%s → %s … %s', (preset, from, to) => {
    expect(presetRange(preset, TODAY)).toEqual({ from, to });
  });

  it('прошлый месяц в январе — декабрь прошлого года', () => {
    expect(presetRange('last_month', '2026-01-15')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(presetRange('last_quarter', '2026-02-10')).toEqual({ from: '2025-10-01', to: '2025-12-31' });
  });

  it('неделя с понедельника и в воскресенье', () => {
    expect(presetRange('this_week', '2026-09-27')).toEqual({ from: '2026-09-21', to: '2026-09-27' });
  });

  it('период узнаётся как готовый вариант', () => {
    expect(matchPreset({ from: '2026-07-01', to: '2026-09-30' }, TODAY)).toBe('this_quarter');
    expect(matchPreset({ from: '2026-09-02', to: '2026-09-30' }, TODAY)).toBeNull();
  });
});

describe('сдвиг стрелками', () => {
  it('целый месяц — на месяц, февраль → март целиком', () => {
    expect(shiftRange({ from: '2026-02-01', to: '2026-02-28' }, 1)).toEqual({ from: '2026-03-01', to: '2026-03-31' });
    expect(shiftRange({ from: '2026-01-01', to: '2026-01-31' }, -1)).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('квартал — на квартал, год — на год', () => {
    expect(shiftRange({ from: '2026-07-01', to: '2026-09-30' }, 1)).toEqual({ from: '2026-10-01', to: '2026-12-31' });
    expect(shiftRange({ from: '2026-01-01', to: '2026-12-31' }, -1)).toEqual({ from: '2025-01-01', to: '2025-12-31' });
  });

  it('произвольный период — на его длину в днях', () => {
    expect(shiftRange({ from: '2026-09-10', to: '2026-09-16' }, 1)).toEqual({ from: '2026-09-17', to: '2026-09-23' });
    expect(shiftRange({ from: '2026-09-24', to: '2026-09-24' }, -1)).toEqual({ from: '2026-09-23', to: '2026-09-23' });
  });
});

describe('порядок дат', () => {
  it('«по» раньше «с» — меняются местами', () => {
    expect(normalizeRange({ from: '2026-09-30', to: '2026-09-01' })).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });
});
