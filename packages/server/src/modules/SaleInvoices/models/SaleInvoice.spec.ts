// © 2026 Bigfin
import { SaleInvoice } from './SaleInvoice';

/**
 * Итог документа с НДС. Приёмка ㉖ поймала перевёрнутое условие вживую:
 * при «НДС сверху» покупателю выставлялось 100 000 вместо 120 000, а журнал
 * расходился ровно на налог.
 *
 * Важно: `subtotal` читается из колонки `balance` — она хранит подытог,
 * который ВКЛЮЧАЕТ налог при «НДС в цене» и НЕ включает при «НДС сверху».
 */
const invoice = (over: Record<string, any> = {}): SaleInvoice =>
  Object.assign(new SaleInvoice(), {
    balance: 100000,
    isInclusiveTax: false,
    exchangeRate: 1,
    ...over,
  });

describe('SaleInvoice.total — документ с НДС', () => {
  it('НДС 20% сверху: итог = подытог + налог', () => {
    const inv = invoice({ taxAmountWithheld: 20000, isInclusiveTax: false });
    expect(inv.subtotal).toBe(100000);
    expect(inv.total).toBe(120000);
    expect(inv.subtotalExludingTax).toBe(100000);
  });

  it('НДС в цене: итог = подытог, налог уже внутри', () => {
    const inv = invoice({
      balance: 120000,
      taxAmountWithheld: 20000,
      isInclusiveTax: true,
    });
    expect(inv.total).toBe(120000);
    expect(inv.subtotalExludingTax).toBe(100000);
  });

  // Главная ловушка правки: у подавляющего большинства документов налога
  // нет вовсе, и колонка пуста — сложение с ней не должно давать «не число».
  it('без налога: итог равен подытогу (а не «не число»)', () => {
    const inv = invoice({ taxAmountWithheld: null });
    expect(Number.isFinite(inv.total)).toBe(true);
    expect(inv.total).toBe(100000);
  });

  it('без скидки: процентная ветка не превращает итог в «не число»', () => {
    const inv = invoice({ discount: undefined, discountType: 'percentage' });
    expect(Number.isFinite(inv.total)).toBe(true);
    expect(inv.total).toBe(100000);
  });

  it('НДС сверху + скидка 10% + корректировка: считается по порядку', () => {
    const inv = invoice({
      taxAmountWithheld: 20000,
      discount: 10,
      discountType: 'percentage',
      adjustment: 500,
    });
    // 100 000 + 20 000 налога − 10 000 скидки + 500 корректировки
    expect(inv.total).toBe(110500);
  });

  it('остаток к оплате считается от итога с налогом', () => {
    const inv = invoice({ taxAmountWithheld: 20000, paymentAmount: 100000 });
    expect(inv.dueAmount).toBe(20000);
  });
});
