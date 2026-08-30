import * as fs from 'fs';
import * as path from 'path';

/**
 * С1 карты v39. Документы ищутся одинаково.
 *
 * У счёта покупателю поиск был заведён по ОДНОМУ полю — номеру счёта, а
 * ссылка и сумма лежали рядом закомментированными. Живьём: «СЧ-001»
 * находит счёт, а его же сумма «100000.000» — нет; у счёта поставщика с
 * тем же запросом по сумме документ находится.
 *
 * Замер по всем моделям с поиском: счёт покупателю был единственным
 * документом с одним полем; остальные ищут по номеру, ссылке и сумме.
 *
 * Правило: документ ищется по своему номеру, по ссылке и по сумме.
 * Закомментированных полей поиска не бывает — либо поле ищется, либо его
 * нет.
 */
const SRC = path.resolve(__dirname, '..');

/** Документы, у которых есть номер, ссылка и сумма. */
const DOCUMENTS: Array<{ model: string; number: string }> = [
  { model: 'SaleInvoices/models/SaleInvoice.ts', number: 'invoice_no' },
  { model: 'SaleEstimates/models/SaleEstimate.ts', number: 'estimate_number' },
  { model: 'SaleReceipts/models/SaleReceipt.ts', number: 'receipt_number' },
  { model: 'Bills/models/Bill.ts', number: 'bill_number' },
  { model: 'CreditNotes/models/CreditNote.ts', number: 'credit_number' },
  { model: 'VendorCredit/models/VendorCredit.ts', number: 'credit_number' },
  {
    model: 'PaymentReceived/models/PaymentReceived.ts',
    number: 'payment_receive_no',
  },
  { model: 'BillPayments/models/BillPayment.ts', number: 'payment_number' },
];

const modelSource = (relative: string): string =>
  fs.readFileSync(path.join(SRC, relative), 'utf8');

const searchRolesBlock = (code: string): string => {
  const match = code.match(/static get searchRoles\(\)[^{]*\{([\s\S]*?)\n  \}/);

  return match ? match[1] : '';
};

/**
 * Действующие строки блока: закомментированное поле поиска не ищет ничего,
 * и принимать его за настоящее — значит писать сторожа, который зеленеет
 * на неисправном продукте.
 */
const activeLines = (block: string): string =>
  block
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');

describe('поля поиска документов', () => {
  it.each(DOCUMENTS)('$model ищет по номеру, ссылке и сумме', ({
    model,
    number,
  }) => {
    const block = activeLines(searchRolesBlock(modelSource(model)));

    expect(block).toContain(`'${number}'`);
    expect(block).toContain("'reference");
    expect(block).toContain("'amount'");
  });

  it.each(DOCUMENTS)('$model не прячет поля поиска в комментарий', ({
    model,
  }) => {
    const block = searchRolesBlock(modelSource(model));
    const commented = block
      .split('\n')
      .filter((line) => /^\s*\/\/.*fieldKey/.test(line));

    expect(commented).toEqual([]);
  });
});
