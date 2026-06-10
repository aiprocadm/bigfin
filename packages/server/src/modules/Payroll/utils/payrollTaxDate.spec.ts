// © 2026 Bigfin
import { payrollTaxDate } from './payrollTaxDate';

describe('payrollTaxDate', () => {
  it('28-е следующего месяца', () => {
    expect(payrollTaxDate('2026-06-01')).toBe('2026-07-28');
  });

  it('декабрь → январь следующего года', () => {
    expect(payrollTaxDate('2026-12-01')).toBe('2027-01-28');
  });
});
