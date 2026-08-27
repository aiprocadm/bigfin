import * as moment from 'moment';
import { Inject, Injectable } from '@nestjs/common';
import { CreateCustomer } from '@/modules/Customers/commands/CreateCustomer.service';
import { CreateItemService } from '@/modules/Items/CreateItem.service';
import { CreateSaleInvoice } from '@/modules/SaleInvoices/commands/CreateSaleInvoice.service';
import { CreatePaymentReceivedService } from '@/modules/PaymentReceived/commands/CreatePaymentReceived.serivce';
import { CreateExpense } from '@/modules/Expenses/commands/CreateExpense.service';
import { Account } from '@/modules/Accounts/models/Account.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import {
  DEMO_CUSTOMERS,
  DEMO_ITEMS,
  DEMO_INVOICES,
  DEMO_PAYMENTS,
  DEMO_EXPENSES,
} from '../OneClickDemo.data';

@Injectable()
export class SeedOneClickDemoDataService {
  constructor(
    private readonly createCustomerService: CreateCustomer,
    private readonly createItemService: CreateItemService,
    private readonly createSaleInvoiceService: CreateSaleInvoice,
    private readonly createPaymentReceivedService: CreatePaymentReceivedService,
    private readonly createExpenseService: CreateExpense,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  /**
   * Наполняет демо-организацию так, чтобы в ней было что смотреть:
   * покупатели, товары и услуги, несколько счетов (Д2 карты v18).
   *
   * Пустая демо-организация бесполезна — человек заходит «посмотреть
   * продукт» и видит пустые списки. Данные создаются обычными службами, а
   * не вставкой в базу: так демо проходит те же проверки и получает те же
   * проводки, что настоящая работа.
   *
   * @param {string} baseCurrency - Базовая валюта демо-организации.
   */
  public async seedDemoData(baseCurrency = 'RUB'): Promise<void> {
    const [incomeAccount, costAccount, bankAccount] = await Promise.all([
      this.accountBySlug('sales-of-product-income'),
      this.accountBySlug('cost-of-goods-sold'),
      this.accountBySlug('bank-account'),
    ]);
    const customerIds = await this.seedCustomers(baseCurrency);
    const itemIds = await this.seedItems(incomeAccount?.id, costAccount?.id);

    // Счета — только если и покупатели, и товары действительно созданы:
    // счёт без позиции не имеет смысла и упадёт на проверке.
    if (!customerIds.length || !itemIds.length) return;

    const invoiceIds = await this.seedInvoices(customerIds, itemIds);

    // Деньги двигаются только когда есть и что оплачивать, и куда класть
    // (С3 карты v29). Без расчётного счёта демо остаётся с одними счетами
    // покупателям — это лучше, чем уронить постройку организации.
    if (!invoiceIds.length || !bankAccount?.id) return;

    await this.seedPayments(customerIds, invoiceIds, bankAccount.id);
    await this.seedExpenses(bankAccount.id);
  }

  /**
   * Счёт учёта по слагу; `undefined`, если такого счёта нет.
   */
  private async accountBySlug(slug: string) {
    return this.accountModel().query().findOne({ slug });
  }

  /**
   * Создаёт демо-покупателей.
   * @returns {Promise<number[]>} Идентификаторы созданных покупателей.
   */
  private async seedCustomers(currencyCode: string): Promise<number[]> {
    const ids: number[] = [];

    for (const customer of DEMO_CUSTOMERS) {
      const created = await this.createCustomerService.createCustomer({
        customerType: customer.customerType,
        currencyCode,
        displayName: customer.displayName,
        companyName: customer.companyName,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        workPhone: customer.workPhone,
        active: true,
      } as any);

      ids.push(created.id);
    }
    return ids;
  }

  /**
   * Создаёт демо-товары и услуги.
   * @returns {Promise<number[]>} Идентификаторы созданных позиций.
   */
  private async seedItems(
    sellAccountId?: number,
    costAccountId?: number,
  ): Promise<number[]> {
    // Без счёта доходов товар не создать — а он приходит из плана счетов
    // при сборке организации. Если его нет, лучше оставить демо без
    // товаров, чем уронить всю постройку.
    if (!sellAccountId) return [];

    const ids: number[] = [];

    for (const item of DEMO_ITEMS) {
      const id = await this.createItemService.createItem({
        name: item.name,
        type: item.type,
        code: item.code,
        sellable: true,
        sellPrice: item.sellPrice,
        sellAccountId,
        sellDescription: item.description,
        purchasable: Boolean(costAccountId),
        ...(costAccountId
          ? { costPrice: item.costPrice, costAccountId }
          : {}),
        active: true,
      } as any);

      ids.push(id);
    }
    return ids;
  }

  /**
   * Создаёт демо-счета покупателям: один оплачиваемый в срок, один уже
   * просроченный — чтобы в списках было видно оба состояния.
   */
  private async seedInvoices(
    customerIds: number[],
    itemIds: number[],
  ): Promise<number[]> {
    const ids: number[] = [];

    for (const invoice of DEMO_INVOICES) {
      const customerId = customerIds[invoice.customerIndex % customerIds.length];

      const entries = invoice.entries.map((entry, index) => ({
        index: index + 1,
        itemId: itemIds[entry.itemIndex % itemIds.length],
        quantity: entry.quantity,
        rate: entry.rate,
        description: entry.description,
      }));

      const created: any = await this.createSaleInvoiceService.createSaleInvoice({
        customerId,
        invoiceDate: moment()
          .subtract(invoice.issuedDaysAgo, 'days')
          .format('YYYY-MM-DD'),
        dueDate: moment()
          .subtract(invoice.issuedDaysAgo, 'days')
          .add(invoice.termDays, 'days')
          .format('YYYY-MM-DD'),
        delivered: invoice.delivered,
        invoiceMessage: invoice.message,
        entries,
      } as any);

      ids.push(created?.id);
    }
    return ids.filter(Boolean);
  }

  /**
   * Создаёт оплаты по демо-счетам: одну полную и одну частичную (С3 карты
   * v29). Деньги приходят на расчётный счёт, поэтому в отчёте о движении
   * денег появляется приход, а в сводке на главной — остаток.
   */
  private async seedPayments(
    customerIds: number[],
    invoiceIds: number[],
    depositAccountId: number,
  ): Promise<void> {
    for (const payment of DEMO_PAYMENTS) {
      const invoiceId = invoiceIds[payment.invoiceIndex];
      // Счёт мог не создаться (например, у него не нашлось позиции) —
      // оплачивать нечего.
      if (!invoiceId) continue;

      const customerId = customerIds[payment.customerIndex % customerIds.length];

      await this.createPaymentReceivedService.createPaymentReceived({
        customerId,
        paymentDate: moment()
          .subtract(payment.paidDaysAgo, 'days')
          .format('YYYY-MM-DD'),
        depositAccountId,
        referenceNo: payment.reference,
        entries: [{ index: 1, invoiceId, paymentAmount: payment.amount }],
      } as any);
    }
  }

  /**
   * Создаёт демо-расходы (С3 карты v29): аренда, канцелярия, банковская
   * комиссия. Публикуем сразу — иначе расход не попадёт в проводки, и
   * отчёт о движении денег покажет только приход.
   */
  private async seedExpenses(paymentAccountId: number): Promise<void> {
    for (const expense of DEMO_EXPENSES) {
      const account = await this.accountBySlug(expense.accountSlug);
      // Счёт учёта берётся из плана счетов организации; если его там нет,
      // пропускаем расход, а не роняем постройку.
      if (!account?.id) continue;

      await this.createExpenseService.newExpense({
        paymentAccountId,
        paymentDate: moment()
          .subtract(expense.paidDaysAgo, 'days')
          .format('YYYY-MM-DD'),
        description: expense.description,
        publish: true,
        categories: [
          {
            index: 1,
            expenseAccountId: account.id,
            amount: expense.amount,
            description: expense.description,
          },
        ],
      } as any);
    }
  }
}
