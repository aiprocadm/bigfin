import {
  computeRatios,
  verticalAnalysis,
  horizontalAnalysis,
  RatioInputs,
} from './computeRatios';

const base: RatioInputs = {
  totalAssets: 1000,
  totalLiabilities: 400,
  equity: 600,
  currentAssets: 500,
  currentLiabilities: 250,
  inventory: 100,
  revenue: 2000,
  netIncome: 300,
};

describe('computeRatios', () => {
  it('считает основные коэффициенты', () => {
    const r = computeRatios(base);
    expect(r.roe).toBeCloseTo(0.5); // 300/600
    expect(r.roa).toBeCloseTo(0.3); // 300/1000
    expect(r.netMargin).toBeCloseTo(0.15); // 300/2000
    expect(r.currentRatio).toBeCloseTo(2); // 500/250
    expect(r.quickRatio).toBeCloseTo(1.6); // (500-100)/250
    expect(r.workingCapital).toBe(250); // 500-250
    expect(r.debtToEquity).toBeCloseTo(0.6667, 3); // 400/600
    expect(r.debtRatio).toBeCloseTo(0.4); // 400/1000
    expect(r.equityRatio).toBeCloseTo(0.6); // 600/1000
  });

  it('нулевой знаменатель → null (неприменимо), оборотный капитал считается всегда', () => {
    const r = computeRatios({
      ...base,
      equity: 0,
      totalAssets: 0,
      currentLiabilities: 0,
      revenue: 0,
    });
    expect(r.roe).toBeNull();
    expect(r.roa).toBeNull();
    expect(r.netMargin).toBeNull();
    expect(r.currentRatio).toBeNull();
    expect(r.quickRatio).toBeNull();
    expect(r.debtToEquity).toBeNull();
    expect(r.equityRatio).toBeNull();
    expect(r.workingCapital).toBe(500); // 500 - 0
  });
});

describe('verticalAnalysis', () => {
  it('доля каждой статьи от выручки', () => {
    const rows = verticalAnalysis(
      [
        { key: 'cogs', label: 'Себестоимость', amount: 1200 },
        { key: 'opex', label: 'Операционные', amount: 500 },
      ],
      2000,
    );
    expect(rows[0].share).toBeCloseTo(0.6);
    expect(rows[1].share).toBeCloseTo(0.25);
  });

  it('нулевая выручка → share null', () => {
    const rows = verticalAnalysis([{ key: 'x', label: 'X', amount: 10 }], 0);
    expect(rows[0].share).toBeNull();
  });
});

describe('horizontalAnalysis', () => {
  it('абсолютное и относительное изменение к прошлому периоду', () => {
    const rows = horizontalAnalysis(
      [{ key: 'rev', label: 'Выручка', amount: 1200 }],
      new Map([['rev', 1000]]),
    );
    expect(rows[0].change).toBe(200);
    expect(rows[0].changePct).toBeCloseTo(0.2);
    expect(rows[0].previous).toBe(1000);
  });

  it('нет прошлого периода (0) → previous 0, changePct null', () => {
    const rows = horizontalAnalysis(
      [{ key: 'new', label: 'Новая', amount: 50 }],
      new Map(),
    );
    expect(rows[0].previous).toBe(0);
    expect(rows[0].change).toBe(50);
    expect(rows[0].changePct).toBeNull();
  });
});
