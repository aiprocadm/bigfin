// © 2026 Bigfin
/**
 * Подписанты печатных форм (вопрос 33 карты v17): ФИО и должность
 * руководителя и ФИО главбуха из метаданных организации должны долетать
 * в пропсы всех пяти русских печатных форм. Пустые значения — пустые
 * строки (линия подписи остаётся пустой, как раньше).
 */
import { transformToRuPaymentInvoiceProps } from './GetRuPaymentInvoicePdf.service';
import { transformToRuActProps } from './GetRuActPdf.service';
import { transformToRuUpdProps } from './GetRuUpdPdf.service';
import { transformToRuTorg12Props } from './GetRuTorg12Pdf.service';
import { transformToRuInvoiceFacturaProps } from './GetRuInvoiceFacturaPdf.service';

const metadata = {
  name: 'ООО «Ромашка»',
  inn: '7707083893',
  signerDirectorName: 'Петров П. П.',
  signerDirectorPosition: 'Генеральный директор',
  signerAccountantName: 'Сидорова С. С.',
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

const transforms: Array<[string, (invoice: any, metadata: any) => any]> = [
  ['счёт на оплату', transformToRuPaymentInvoiceProps],
  ['акт', transformToRuActProps],
  ['УПД', transformToRuUpdProps],
  ['ТОРГ-12', transformToRuTorg12Props],
  ['счёт-фактура', transformToRuInvoiceFacturaProps],
];

describe('Подписанты печатных форм', () => {
  it.each(transforms)('%s: ФИО подписантов долетают в пропсы', (_name, fn) => {
    const props = fn(invoice, metadata);

    expect(props.signerDirectorName).toBe('Петров П. П.');
    expect(props.signerDirectorPosition).toBe('Генеральный директор');
    expect(props.signerAccountantName).toBe('Сидорова С. С.');
  });

  it.each(transforms)('%s: пустые подписанты — пустые строки', (_name, fn) => {
    const props = fn(invoice, { name: 'ООО «Ромашка»' });

    expect(props.signerDirectorName).toBe('');
    expect(props.signerDirectorPosition).toBe('');
    expect(props.signerAccountantName).toBe('');
  });
});
