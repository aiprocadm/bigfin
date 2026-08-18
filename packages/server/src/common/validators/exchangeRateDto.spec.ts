import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateExpenseDto } from '@/modules/Expenses/dtos/Expense.dto';
import { CreateBillPaymentDto } from '@/modules/BillPayments/dtos/BillPayment.dto';
import { CreatePaymentReceivedDto } from '@/modules/PaymentReceived/dtos/PaymentReceived.dto';
import { CreateSaleInvoiceDto } from '@/modules/SaleInvoices/dtos/SaleInvoice.dto';

/**
 * С4 (карта v14): курс не может быть нулём или отрицательным. Раньше три DTO
 * пропускали любое число, счёт — ноль; дальше «|| 1» молча глушил ошибку
 * прямо в журнал учёта.
 */
const rateErrors = async (dtoClass: any, exchangeRate: unknown) => {
  const instance = plainToInstance(dtoClass, { exchangeRate });
  const errors = await validate(instance as object);
  return errors.find((e) => e.property === 'exchangeRate');
};

describe.each([
  ['расход', CreateExpenseDto],
  ['оплата поставщику', CreateBillPaymentDto],
  ['оплата покупателя', CreatePaymentReceivedDto],
  ['счёт покупателя', CreateSaleInvoiceDto],
])('курс в DTO: %s', (_label, dtoClass) => {
  it('ноль отклоняется', async () => {
    expect(await rateErrors(dtoClass, 0)).toBeDefined();
  });

  it('отрицательный отклоняется', async () => {
    expect(await rateErrors(dtoClass, -2)).toBeDefined();
  });

  it('обычный курс проходит', async () => {
    expect(await rateErrors(dtoClass, 92.5)).toBeUndefined();
  });

  it('отсутствие курса не ошибка на уровне DTO', async () => {
    expect(await rateErrors(dtoClass, undefined)).toBeUndefined();
  });
});
