// © 2026 Bigfin
import { ACCOUNT_TYPE, ACCOUNT_TYPES, ACCOUNT_NORMAL } from './accounts';

describe('ACCOUNT_TYPE.ACCUMULATED_DEPRECIATION', () => {
  it('тип существует со значением accumulated-depreciation', () => {
    expect(ACCOUNT_TYPE.ACCUMULATED_DEPRECIATION).toBe(
      'accumulated-depreciation',
    );
  });

  it('контр-актив: нормаль CREDIT, в Балансе, не в ОПиУ, root=asset', () => {
    const meta = ACCOUNT_TYPES.find(
      (t) => t.key === ACCOUNT_TYPE.ACCUMULATED_DEPRECIATION,
    );
    expect(meta).toBeDefined();
    expect(meta.normal).toBe(ACCOUNT_NORMAL.CREDIT);
    expect(meta.balanceSheet).toBe(true);
    expect(meta.incomeSheet).toBe(false);
    expect(meta.rootType).toBe('asset');
  });
});
