// © 2026 Bigfin
import { transformToRuTorg12Props } from './GetRuTorg12Pdf.service';

const metadata = {
  name: 'ООО «Ромашка»',
  inn: '7707083893',
  kpp: '770701001',
  address: { postalCode: '101000', city: 'Москва', address1: 'ул. Ленина, д. 1' },
  bankName: 'ПАО СБЕРБАНК',
  bankAccount: '40702810400000000001',
  bankBik: '044525225',
};

const invoice = {
  invoiceNo: 'INV-42',
  invoiceDate: '2026-07-26',
  currencyCode: 'RUB',
  customer: {
    displayName: 'ООО «Покупатель»',
    inn: '5001007322',
    kpp: '500101001',
    billingAddressPostcode: '141000',
    billingAddressCity: 'г. Мытищи',
    shippingAddressPostcode: '141002',
    shippingAddressCity: 'г. Королёв',
  },
  entries: [
    {
      item: { name: 'Товар А', code: 'A-1', type: 'inventory' },
      quantity: 2,
      rate: 1500,
      taxRate: 20,
      taxAmount: 600,
      subtotalExcludingTax: 3000,
      subtotalInclusingTax: 3600,
    },
  ],
};

describe('transformToRuTorg12Props', () => {
  it('номер и дата документа — дата цифрами', () => {
    const props = transformToRuTorg12Props(invoice, metadata);

    expect(props.documentNumber).toBe('INV-42');
    expect(props.documentDate).toBe('26.07.2026');
  });

  it('грузоотправитель и поставщик — одна и та же строка реквизитов организации', () => {
    const props = transformToRuTorg12Props(invoice, metadata);

    expect(props.shipperLine).toBe(
      'ООО «Ромашка», ИНН 7707083893, КПП 770701001, ' +
        '101000, Москва, ул. Ленина, д. 1, банк ПАО СБЕРБАНК, ' +
        'р/с 40702810400000000001, БИК 044525225',
    );
    expect(props.supplierLine).toBe(props.shipperLine);
  });

  it('грузополучатель берёт адрес доставки, плательщик — платёжный', () => {
    const props = transformToRuTorg12Props(invoice, metadata);

    expect(props.consigneeLine).toContain('141002, г. Королёв');
    expect(props.payerLine).toContain('141000, г. Мытищи');
    expect(props.consigneeLine).toContain('ИНН 5001007322');
  });

  it('основание — счёт, если ссылки на договор нет', () => {
    const props = transformToRuTorg12Props(invoice, metadata);

    expect(props.basisName).toBe('Счёт');
    expect(props.basisNumber).toBe('INV-42');
    expect(props.basisDate).toBe('26.07.2026');
  });

  it('основание — договор, если у счёта заполнена ссылка', () => {
    const props = transformToRuTorg12Props(
      { ...invoice, referenceNo: 'ДГ-7' },
      metadata,
    );

    expect(props.basisName).toBe('Договор');
    expect(props.basisNumber).toBe('ДГ-7');
  });

  it('позиция: код товара, количество, цена без НДС, ставка и суммы', () => {
    const props = transformToRuTorg12Props(invoice, metadata);

    expect(props.lines).toEqual([
      {
        index: 1,
        title: 'Товар А',
        code: 'A-1',
        quantity: '2',
        price: '1 500,00',
        amountExclVat: '3 000,00',
        vatRate: '20%',
        vatAmount: '600,00',
        amountInclVat: '3 600,00',
      },
    ]);
  });

  it('итоги: количество, суммы и сумма прописью', () => {
    const props = transformToRuTorg12Props(invoice, metadata);

    expect(props.totalQuantity).toBe('2');
    expect(props.totalAmountExclVat).toBe('3 000,00');
    expect(props.totalVatAmount).toBe('600,00');
    expect(props.totalAmountInclVat).toBe('3 600,00');
    expect(props.entriesCountInWords).toBe('один');
    expect(props.totalInWords).toBe('Три тысячи шестьсот рублей 00 копеек');
  });

  it('несколько позиций: количество и суммы складываются', () => {
    const props = transformToRuTorg12Props(
      {
        ...invoice,
        entries: [
          ...invoice.entries,
          {
            item: { name: 'Товар Б', code: 'B-2', type: 'inventory' },
            quantity: 3,
            rate: 500,
            taxRate: 10,
            taxAmount: 150,
            subtotalExcludingTax: 1500,
            subtotalInclusingTax: 1650,
          },
        ],
      },
      metadata,
    );

    expect(props.totalQuantity).toBe('5');
    expect(props.totalAmountInclVat).toBe('5 250,00');
    expect(props.entriesCountInWords).toBe('два');
  });

  it('позиции без НДС помечаются «Без НДС» и в строках, и в итоге', () => {
    const props = transformToRuTorg12Props(
      {
        ...invoice,
        entries: [{ item: { name: 'Услуга' }, quantity: 1, rate: 1000 }],
      },
      metadata,
    );

    expect(props.lines[0].vatRate).toBe('Без НДС');
    expect(props.lines[0].vatAmount).toBe('Без НДС');
    expect(props.totalVatAmount).toBe('Без НДС');
    expect(props.totalAmountInclVat).toBe('1 000,00');
  });

  it('нерублёвый счёт — без суммы прописью', () => {
    const props = transformToRuTorg12Props(
      { ...invoice, currencyCode: 'USD' },
      metadata,
    );

    expect(props.totalInWords).toBe('');
  });

  it('отрицательный итог не валит генерацию — сумма прописью пустая', () => {
    const props = transformToRuTorg12Props(
      {
        ...invoice,
        entries: [
          {
            item: { name: 'Возврат' },
            quantity: 1,
            rate: -100,
            subtotalExcludingTax: -100,
            subtotalInclusingTax: -100,
          },
        ],
      },
      metadata,
    );

    expect(props.totalInWords).toBe('');
    expect(props.totalAmountInclVat).toBe('-100,00');
  });

  it('пустые реквизиты и позиции не валят генерацию', () => {
    const props = transformToRuTorg12Props(
      { invoiceNo: 'INV-1', invoiceDate: '2026-01-01', entries: [] },
      {},
    );

    expect(props.shipperLine).toBe('');
    expect(props.consigneeLine).toBe('');
    expect(props.payerLine).toBe('');
    expect(props.lines).toEqual([]);
    expect(props.totalAmountInclVat).toBe('0,00');
    expect(props.entriesCountInWords).toBe('ноль');
    expect(props.totalInWords).toBe('Ноль рублей 00 копеек');
  });
});
