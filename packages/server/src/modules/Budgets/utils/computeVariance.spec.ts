import { computeVariance } from './computeVariance';

describe('computeVariance', () => {
  it('computes absolute and percent variance (fact − plan)', () => {
    expect(computeVariance(540000, 512000)).toEqual({
      varianceAbs: -28000,
      variancePct: -5.19,
    });
  });

  it('returns null percent when plan is zero', () => {
    expect(computeVariance(0, 5000)).toEqual({
      varianceAbs: 5000,
      variancePct: null,
    });
  });

  it('returns zero variance when plan equals fact', () => {
    expect(computeVariance(150000, 150000)).toEqual({
      varianceAbs: 0,
      variancePct: 0,
    });
  });
});
