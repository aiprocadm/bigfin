import * as fs from 'fs';
import * as path from 'path';
import { activeCode } from '../../testing/activeCode';

/**
 * Сторож С4 (карта v14): трансформер документа с валютой контрагента и
 * умолчанием «|| 1» обязан звать assertValidExchangeRate — иначе документ
 * в чужой валюте молча проводится по курсу 1.
 *
 * ManualJournal в списке нет намеренно: у ручной проводки валюта задаётся
 * самим журналом, не контрагентом — отдельная тема (ядро мультивалюты).
 */
const TRANSFORMERS = [
  'modules/Bills/commands/BillDTOTransformer.service.ts',
  'modules/Expenses/commands/CommandExpenseDTO.transformer.ts',
  'modules/SaleInvoices/commands/CommandSaleInvoiceDTOTransformer.service.ts',
  'modules/SaleReceipts/commands/SaleReceiptDTOTransformer.service.ts',
  'modules/BillPayments/commands/CommandBillPaymentDTOTransformer.service.ts',
  'modules/PaymentReceived/commands/PaymentReceivedDTOTransformer.ts',
  'modules/CreditNotes/commands/CommandCreditNoteDTOTransform.service.ts',
  'modules/VendorCredit/commands/VendorCreditDTOTransform.service.ts',
];

describe('трансформеры документов валидируют курс', () => {
  it.each(TRANSFORMERS)('%s зовёт assertValidExchangeRate', (rel) => {
    const source = activeCode(
      fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf-8'),
    );
    expect(source).toContain('assertValidExchangeRate(');
  });
});
