// © 2026 Bigfin
import { transformToRuPaymentInvoiceProps } from './GetRuPaymentInvoicePdf.service';

const metadata = {
  name: 'ООО «Ромашка»',
  inn: '7707083893',
  kpp: '770701001',
  bankName: 'ПАО СБЕРБАНК',
  bankBik: '044525225',
  bankAccount: '40702810400000000001',
  bankCorrespondentAccount: '30101810400000000225',
  addressTextFormatted: 'г. Москва, ул. Ленина, д. 1',
};

const invoice = {
  invoiceNo: 'INV-42',
  invoiceDate: '2026-07-26',
  currencyCode: 'RUB',
  subtotal: 3000,
  total: 3000,
  taxAmountWithheld: 0,
  customer: { displayName: 'ИП Иванов И. И.', inn: '500100732259' },
  entries: [
    { item: { name: 'Консультация' }, quantity: 2, rate: 1500, total: 3000 },
  ],
};

describe('transformToRuPaymentInvoiceProps', () => {
  it('собирает реквизиты продавца из метаданных организации', () => {
    const props = transformToRuPaymentInvoiceProps(invoice, metadata);

    expect(props.bankName).toBe('ПАО СБЕРБАНК');
    expect(props.bankBik).toBe('044525225');
    expect(props.bankAccount).toBe('40702810400000000001');
    expect(props.bankCorrespondentAccount).toBe('30101810400000000225');
    expect(props.sellerInn).toBe('7707083893');
    expect(props.sellerKpp).toBe('770701001');
    expect(props.sellerName).toBe('ООО «Ромашка»');
    expect(props.sellerLine).toBe(
      'ООО «Ромашка», ИНН 7707083893, КПП 770701001, г. Москва, ул. Ленина, д. 1',
    );
  });

  it('собирает строку покупателя с ИНН', () => {
    const props = transformToRuPaymentInvoiceProps(invoice, metadata);
    expect(props.buyerLine).toBe('ИП Иванов И. И., ИНН 500100732259');
  });

  it('покупатель с КПП — строка «ИНН …, КПП …»', () => {
    const props = transformToRuPaymentInvoiceProps(
      {
        ...invoice,
        customer: { ...invoice.customer, kpp: '770701002' },
      },
      metadata,
    );
    expect(props.buyerLine).toBe(
      'ИП Иванов И. И., ИНН 500100732259, КПП 770701002',
    );
  });

  it('покупатель без ИНН — только название', () => {
    const props = transformToRuPaymentInvoiceProps(
      { ...invoice, customer: { displayName: 'Физлицо' } },
      metadata,
    );
    expect(props.buyerLine).toBe('Физлицо');
  });

  it('номер, дата, позиции и суммы в русском формате', () => {
    const props = transformToRuPaymentInvoiceProps(invoice, metadata);

    expect(props.documentNumber).toBe('INV-42');
    expect(props.documentDate).toBe('26 июля 2026 г.');
    expect(props.lines).toEqual([
      {
        index: 1,
        title: 'Консультация',
        quantity: '2',
        unit: '',
        price: '1 500,00',
        amount: '3 000,00',
      },
    ]);
    expect(props.subtotal).toBe('3 000,00');
    expect(props.total).toBe('3 000,00');
    expect(props.itemsCount).toBe(1);
    expect(props.totalInWords).toBe('Три тысячи рублей 00 копеек');
  });

  it('без НДС: подпись «Без налога (НДС)» и пустая сумма', () => {
    const props = transformToRuPaymentInvoiceProps(invoice, metadata);
    expect(props.vatLabel).toBe('Без налога (НДС)');
    expect(props.vatAmount).toBeUndefined();
  });

  it('с НДС: подпись «В том числе НДС» и сумма налога', () => {
    const props = transformToRuPaymentInvoiceProps(
      { ...invoice, taxAmountWithheld: 500, total: 3000 },
      metadata,
    );
    expect(props.vatLabel).toBe('В том числе НДС');
    expect(props.vatAmount).toBe('500,00');
  });

  it('пустые реквизиты не валят генерацию (пользователь их ещё не ввёл)', () => {
    const props = transformToRuPaymentInvoiceProps(
      {
        invoiceNo: 'INV-1',
        invoiceDate: '2026-01-01',
        subtotal: 0,
        total: 0,
        entries: [],
      },
      {},
    );

    expect(props.sellerLine).toBe('');
    expect(props.buyerLine).toBe('');
    expect(props.bankName).toBe('');
    expect(props.lines).toEqual([]);
    expect(props.total).toBe('0,00');
    expect(props.totalInWords).toBe('Ноль рублей 00 копеек');
  });

  it('нерублёвый счёт — без суммы прописью', () => {
    const props = transformToRuPaymentInvoiceProps(
      { ...invoice, currencyCode: 'USD' },
      metadata,
    );
    expect(props.totalInWords).toBe('');
  });

  it('дробное количество — русская запятая', () => {
    const props = transformToRuPaymentInvoiceProps(
      {
        ...invoice,
        entries: [{ item: { name: 'Кабель' }, quantity: 2.5, rate: 100, total: 250 }],
      },
      metadata,
    );
    expect(props.lines[0].quantity).toBe('2,5');
    expect(props.lines[0].amount).toBe('250,00');
  });
});
