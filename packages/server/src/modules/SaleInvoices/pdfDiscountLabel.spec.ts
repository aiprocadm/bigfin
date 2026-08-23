/**
 * Р3 карты v18: хардкод «Discount» затирал переведённый лейбл скидки —
 * утилиты спредятся ПОСЛЕ атрибутов брендирования в PDF счёта и чека,
 * уходящих клиенту. Теперь утилита принимает базовый лейбл (из шаблона
 * организации) и лишь дописывает процент.
 */
import { transformInvoiceToPdfTemplate } from './utils';
import { transformReceiptToBrandingTemplateAttributes } from '../SaleReceipts/utils';

const invoice: any = {
  entries: [],
  taxes: [],
  customer: {},
  discountAmountFormatted: '1 000,00 ₽',
  discountPercentageFormatted: '10%',
};

const receipt: any = {
  entries: [],
  customer: {},
  discountAmountFormatted: '500,00 ₽',
  discountPercentageFormatted: '5%',
};

describe('Лейбл скидки в PDF (счёт и чек)', () => {
  it('счёт: базовый лейбл из шаблона + процент', () => {
    const props = transformInvoiceToPdfTemplate(invoice, {
      discountLabel: 'Скидка',
    });
    expect(props.discountLabel).toBe('Скидка [10%]');
  });

  it('счёт: без процента — базовый лейбл как есть', () => {
    const props = transformInvoiceToPdfTemplate(
      { ...invoice, discountPercentageFormatted: '' },
      { discountLabel: 'Скидка' },
    );
    expect(props.discountLabel).toBe('Скидка');
  });

  it('счёт: без опций — прежнее английское поведение (совместимость)', () => {
    const props = transformInvoiceToPdfTemplate(invoice);
    expect(props.discountLabel).toBe('Discount [10%]');
  });

  it('чек: базовый лейбл из шаблона + процент', () => {
    const props = transformReceiptToBrandingTemplateAttributes(receipt, {
      discountLabel: 'Скидка',
    });
    expect(props.discountLabel).toBe('Скидка [5%]');
  });

  it('чек: без опций — прежнее поведение', () => {
    const props = transformReceiptToBrandingTemplateAttributes(receipt);
    expect(props.discountLabel).toBe('Discount [5%]');
  });
});
