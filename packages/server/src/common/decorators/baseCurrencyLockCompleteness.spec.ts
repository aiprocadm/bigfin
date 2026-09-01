// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { getPreventMutateBaseCurrencyModels } from './LockMutateBaseCurrency.decorator';

import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { Bill } from '@/modules/Bills/models/Bill';
import { ManualJournal } from '@/modules/ManualJournals/models/ManualJournal';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { Account } from '@/modules/Accounts/models/Account.model';
import { Expense } from '@/modules/Expenses/models/Expense.model';
import { PaymentReceived } from '@/modules/PaymentReceived/models/PaymentReceived';
import { BillPayment } from '@/modules/BillPayments/models/BillPayment';
import { CreditNote } from '@/modules/CreditNotes/models/CreditNote';
import { VendorCredit } from '@/modules/VendorCredit/models/VendorCredit';
import { SaleReceipt } from '@/modules/SaleReceipts/models/SaleReceipt';
import { SaleEstimate } from '@/modules/SaleEstimates/models/SaleEstimate';
import { Item } from '@/modules/Items/models/Item';
import { activeCode } from '../../testing/activeCode';

/**
 * Р1 срез 1 (карта v16). Смена базовой валюты организации переписывает
 * валюту ВСЕМ счетам и не конвертирует ни одной суммы: рубли начинают
 * считаться долларами. Откатить нечем — это единственный необратимый
 * сценарий порчи данных в продукте.
 *
 * Защита от этого написана и НЕ РАБОТАЛА: реестр блокировок наполняет
 * только декоратор `@PreventMutateBaseCurrency()`, а навешен он был на одну
 * модель — товары. Двенадцать денежных моделей объявляли защиту статическим
 * геттером, который в реестр не попадает никогда. Организация без товаров
 * меняла валюту в один клик.
 */
const MONEY_MODELS = [
  SaleInvoice,
  Bill,
  ManualJournal,
  AccountTransaction,
  Account,
  Expense,
  PaymentReceived,
  BillPayment,
  CreditNote,
  VendorCredit,
  SaleReceipt,
  SaleEstimate,
];

const MODULES = path.resolve(__dirname, '../../modules');

const collectModelSources = (dir: string): string[] => {
  const out: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...collectModelSources(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.includes('.spec.')) {
      out.push(full);
    }
  }
  return out;
};

describe('замок смены базовой валюты', () => {
  const registered = getPreventMutateBaseCurrencyModels();

  it('денежные модели вообще перечислены', () => {
    // Иначе пустой список сделал бы проверку ниже бессмысленно зелёной.
    expect(MONEY_MODELS.length).toBeGreaterThan(10);
  });

  it('каждая денежная модель стоит в реестре замка', () => {
    const missing = MONEY_MODELS.filter(
      (Model) => !registered.has(Model.name),
    ).map((Model) => Model.name);

    expect(missing).toEqual([]);
  });

  it('товары тоже на месте — прежнее поведение не сломано', () => {
    expect(registered.has(Item.name)).toBe(true);
  });

  it('защита объявляется ровно одним способом — декоратором', () => {
    // Статический геттер выглядит как защита, но в реестр не попадает.
    // Именно из-за двух способов дыра и прожила незамеченной.
    const byGetter = collectModelSources(MODULES)
      .filter((file) =>
        /static\s+get\s+preventMutateBaseCurrency/.test(
          activeCode(fs.readFileSync(file, 'utf8')),
        ),
      )
      .map((file) => path.relative(MODULES, file));

    expect(byGetter).toEqual([]);
  });
});
