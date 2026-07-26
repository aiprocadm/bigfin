// © 2026 Bigfin
import { transformToRuActProps } from './GetRuActPdf.service';

const metadata = {
  name: 'ООО «Ромашка»',
  inn: '7707083893',
  kpp: '770701001',
  addressTextFormatted: 'г. Москва, ул. Ленина, д. 1',
};

const invoice = {
  invoiceNo: 'INV-42',
  invoiceDate: '2026-07-26',
  currencyCode: 'RUB',
  subtotal: 3000,
  total: 3000,
  taxAmountWithheld: 0,
  customer: {
    displayName: 'ИП Иванов И. И.',
    inn: '500100732259',
    kpp: '770701002',
  },
  entries: [
    { item: { name: 'Консультация' }, quantity: 2, rate: 1500, total: 3000 },
  ],
};

describe('transformToRuActProps', () => {
  it('собирает стороны: исполнитель из метаданных, заказчик с ИНН и КПП', () => {
    const props = transformToRuActProps(invoice, metadata);

    expect(props.sellerLine).toBe(
      'ООО «Ромашка», ИНН 7707083893, КПП 770701001, г. Москва, ул. Ленина, д. 1',
    );
    expect(props.buyerLine).toBe(
      'ИП Иванов И. И., ИНН 500100732259, КПП 770701002',
    );
  });

  it('номер и дата акта совпадают со счётом', () => {
    const props = transformToRuActProps(invoice, metadata);
    expect(props.documentNumber).toBe('INV-42');
    expect(props.documentDate).toBe('26 июля 2026 г.');
  });

  it('позиции, итоги и сумма прописью', () => {
    const props = transformToRuActProps(invoice, metadata);

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
    expect(props.vatLabel).toBe('Без налога (НДС)');
    expect(props.vatAmount).toBeUndefined();
    expect(props.itemsCount).toBe(1);
    expect(props.totalInWords).toBe('Три тысячи рублей 00 копеек');
  });

  it('с НДС: подпись «В том числе НДС» и сумма налога', () => {
    const props = transformToRuActProps(
      { ...invoice, taxAmountWithheld: 500 },
      metadata,
    );
    expect(props.vatLabel).toBe('В том числе НДС');
    expect(props.vatAmount).toBe('500,00');
  });

  it('пустые данные не валят генерацию', () => {
    const props = transformToRuActProps(
      { invoiceNo: 'INV-1', invoiceDate: '2026-01-01', total: 0, entries: [] },
      {},
    );
    expect(props.sellerLine).toBe('');
    expect(props.buyerLine).toBe('');
    expect(props.lines).toEqual([]);
    expect(props.totalInWords).toBe('Ноль рублей 00 копеек');
  });
});
