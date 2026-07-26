// © 2026 Bigfin
import { transformToRuUpdProps } from './GetRuUpdPdf.service';

const metadata = {
  name: 'ООО «Ромашка»',
  inn: '7707083893',
  kpp: '770701001',
  addressTextFormatted: 'г. Москва, ул. Ленина, д. 1',
};

const invoiceWithVat = {
  invoiceNo: 'INV-42',
  invoiceDate: '2026-07-26',
  currencyCode: 'RUB',
  customer: {
    displayName: 'ООО «Покупатель»',
    inn: '5001007322',
    kpp: '500101001',
    billingAddressPostcode: '141000',
    billingAddressCity: 'г. Мытищи',
    billingAddress1: 'ул. Мира, д. 5',
  },
  entries: [
    {
      item: { name: 'Товар А' },
      quantity: 2,
      rate: 1500,
      taxRate: 20,
      taxAmount: 600,
      subtotalExcludingTax: 3000,
      subtotalInclusingTax: 3600,
    },
  ],
};

describe('transformToRuUpdProps', () => {
  it('шапка счёта-фактуры: статус, номер, дата, стороны', () => {
    const props = transformToRuUpdProps(invoiceWithVat, metadata);

    expect(props.status).toBe('1');
    expect(props.documentNumber).toBe('INV-42');
    expect(props.documentDate).toBe('26 июля 2026 г.');
    expect(props.sellerName).toBe('ООО «Ромашка»');
    expect(props.sellerAddress).toBe('г. Москва, ул. Ленина, д. 1');
    expect(props.sellerInnKpp).toBe('7707083893 / 770701001');
    expect(props.buyerName).toBe('ООО «Покупатель»');
    expect(props.buyerAddress).toBe('141000, г. Мытищи, ул. Мира, д. 5');
    expect(props.buyerInnKpp).toBe('5001007322 / 500101001');
    expect(props.currencyLine).toBe('Российский рубль, 643');
    expect(props.baseDocument).toBe('Счёт № INV-42 от 26 июля 2026 г.');
  });

  it('строка с НДС 20%: цена и стоимость без НДС, сумма НДС, стоимость с НДС', () => {
    const props = transformToRuUpdProps(invoiceWithVat, metadata);

    expect(props.lines).toEqual([
      {
        index: 1,
        title: 'Товар А',
        unit: '',
        quantity: '2',
        priceExclVat: '1 500,00',
        amountExclVat: '3 000,00',
        vatRate: '20%',
        vatAmount: '600,00',
        amountInclVat: '3 600,00',
      },
    ]);
    expect(props.totalExclVat).toBe('3 000,00');
    expect(props.totalVat).toBe('600,00');
    expect(props.totalInclVat).toBe('3 600,00');
  });

  it('строка без НДС: «Без НДС» в ставке и сумме', () => {
    const props = transformToRuUpdProps(
      {
        ...invoiceWithVat,
        entries: [{ item: { name: 'Услуга' }, quantity: 1, rate: 1000 }],
      },
      metadata,
    );

    expect(props.lines[0].vatRate).toBe('Без НДС');
    expect(props.lines[0].vatAmount).toBe('Без НДС');
    expect(props.lines[0].amountExclVat).toBe('1 000,00');
    expect(props.lines[0].amountInclVat).toBe('1 000,00');
    expect(props.totalVat).toBe('Без НДС');
  });

  it('итоги суммируются по строкам', () => {
    const props = transformToRuUpdProps(
      {
        ...invoiceWithVat,
        entries: [
          {
            item: { name: 'А' },
            quantity: 1,
            rate: 1000,
            taxRate: 20,
            taxAmount: 200,
            subtotalExcludingTax: 1000,
            subtotalInclusingTax: 1200,
          },
          {
            item: { name: 'Б' },
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

    expect(props.lines[1].vatRate).toBe('10%');
    expect(props.totalExclVat).toBe('2 500,00');
    expect(props.totalVat).toBe('350,00');
    expect(props.totalInclVat).toBe('2 850,00');
  });

  it('пустые реквизиты и позиции не валят генерацию', () => {
    const props = transformToRuUpdProps(
      { invoiceNo: 'INV-1', invoiceDate: '2026-01-01', entries: [] },
      {},
    );

    expect(props.sellerInnKpp).toBe('');
    expect(props.buyerName).toBe('');
    expect(props.lines).toEqual([]);
    expect(props.totalInclVat).toBe('0,00');
  });

  it('нерублёвая валюта — код валюты вместо рубля', () => {
    const props = transformToRuUpdProps(
      { ...invoiceWithVat, currencyCode: 'USD' },
      metadata,
    );
    expect(props.currencyLine).toBe('USD');
  });
});
