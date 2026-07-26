// © 2026 Bigfin
import { transformToRuInvoiceFacturaProps } from './GetRuInvoiceFacturaPdf.service';

const metadata = {
  name: 'ООО «Ромашка»',
  inn: '7707083893',
  kpp: '770701001',
  address: { postalCode: '101000', city: 'Москва', address1: 'ул. Ленина, д. 1' },
};

const goodsEntry = {
  item: { name: 'Товар А', code: 'A-1', type: 'inventory' },
  quantity: 2,
  rate: 1500,
  taxRate: 20,
  taxAmount: 600,
  subtotalExcludingTax: 3000,
  subtotalInclusingTax: 3600,
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
  entries: [goodsEntry],
};

describe('transformToRuInvoiceFacturaProps', () => {
  it('строки (1), (2)…(2б): номер, дата цифрами и реквизиты продавца', () => {
    const props = transformToRuInvoiceFacturaProps(invoice, metadata);

    expect(props.documentNumber).toBe('INV-42');
    expect(props.documentDate).toBe('26.07.2026');
    expect(props.sellerName).toBe('ООО «Ромашка»');
    expect(props.sellerAddress).toBe('101000, Москва, ул. Ленина, д. 1');
    expect(props.sellerInnKpp).toBe('7707083893 / 770701001');
  });

  it('строки (6)…(6б): реквизиты покупателя с платёжным адресом', () => {
    const props = transformToRuInvoiceFacturaProps(invoice, metadata);

    expect(props.buyerName).toBe('ООО «Покупатель»');
    expect(props.buyerAddress).toBe('141000, г. Мытищи');
    expect(props.buyerInnKpp).toBe('5001007322 / 500101001');
  });

  it('отгрузка товара: (3) «он же», (4) покупатель с адресом доставки', () => {
    const props = transformToRuInvoiceFacturaProps(invoice, metadata);

    expect(props.shipperLine).toBe('он же');
    expect(props.consigneeLine).toBe('ООО «Покупатель», 141002, г. Королёв');
  });

  it('только услуги: (3) и (4) — прочерки', () => {
    const props = transformToRuInvoiceFacturaProps(
      {
        ...invoice,
        entries: [{ item: { name: 'Консультация', type: 'service' }, quantity: 1, rate: 1000 }],
      },
      metadata,
    );

    expect(props.shipperLine).toBe('—');
    expect(props.consigneeLine).toBe('—');
  });

  it('незаполняемые реквизиты — прочерки', () => {
    const props = transformToRuInvoiceFacturaProps(invoice, metadata);

    expect(props.correctionNumber).toBe('—');
    expect(props.correctionDate).toBe('—');
    expect(props.paymentDocument).toBe('—');
    expect(props.shipmentDocument).toBe('—');
    expect(props.govContractId).toBe('—');
  });

  it('позиция с НДС: количество, цена без налога, ставка и суммы', () => {
    const props = transformToRuInvoiceFacturaProps(invoice, metadata);

    expect(props.lines).toEqual([
      {
        index: 1,
        title: 'Товар А',
        quantity: '2',
        price: '1 500,00',
        amountExclVat: '3 000,00',
        vatRate: '20%',
        vatAmount: '600,00',
        amountInclVat: '3 600,00',
      },
    ]);
    expect(props.totalAmountExclVat).toBe('3 000,00');
    expect(props.totalVatAmount).toBe('600,00');
    expect(props.totalAmountInclVat).toBe('3 600,00');
  });

  it('несколько ставок: итоги складываются', () => {
    const props = transformToRuInvoiceFacturaProps(
      {
        ...invoice,
        entries: [
          goodsEntry,
          {
            item: { name: 'Товар Б', type: 'inventory' },
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
    expect(props.totalAmountExclVat).toBe('4 500,00');
    expect(props.totalVatAmount).toBe('750,00');
    expect(props.totalAmountInclVat).toBe('5 250,00');
  });

  it('без НДС (УСН): ставка и сумма налога — «Без НДС»', () => {
    const props = transformToRuInvoiceFacturaProps(
      {
        ...invoice,
        entries: [{ item: { name: 'Услуга', type: 'service' }, quantity: 1, rate: 1000 }],
      },
      metadata,
    );

    expect(props.lines[0].vatRate).toBe('Без НДС');
    expect(props.lines[0].vatAmount).toBe('Без НДС');
    expect(props.totalVatAmount).toBe('Без НДС');
  });

  it('организация (ИНН 10 знаков) — две подписи, не блок ИП', () => {
    const props = transformToRuInvoiceFacturaProps(invoice, metadata);

    expect(props.isSoleProprietor).toBe(false);
  });

  it('ИП (ИНН 12 знаков) — блок ИП с ОГРНИП и ИНН без КПП', () => {
    const props = transformToRuInvoiceFacturaProps(invoice, {
      name: 'ИП Иванов И. И.',
      inn: '500100732259',
      ogrn: '304500116000157',
    });

    expect(props.isSoleProprietor).toBe(true);
    expect(props.soleProprietorOgrn).toBe('304500116000157');
    expect(props.sellerInnKpp).toBe('500100732259');
  });

  it('нерублёвая валюта — код валюты вместо рубля', () => {
    const props = transformToRuInvoiceFacturaProps(
      { ...invoice, currencyCode: 'USD' },
      metadata,
    );

    expect(props.currencyLine).toBe('USD');
  });

  it('пустые реквизиты и позиции не валят генерацию', () => {
    const props = transformToRuInvoiceFacturaProps(
      { invoiceNo: 'INV-1', invoiceDate: '2026-01-01', entries: [] },
      {},
    );

    expect(props.sellerName).toBe('');
    expect(props.sellerInnKpp).toBe('');
    expect(props.buyerName).toBe('');
    expect(props.shipperLine).toBe('—');
    expect(props.lines).toEqual([]);
    expect(props.totalAmountInclVat).toBe('0,00');
    expect(props.isSoleProprietor).toBe(false);
  });
});
