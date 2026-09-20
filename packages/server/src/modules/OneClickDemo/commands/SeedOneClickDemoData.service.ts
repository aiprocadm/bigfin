import * as moment from 'moment';
import { Inject, Injectable } from '@nestjs/common';
import { CreateCustomer } from '@/modules/Customers/commands/CreateCustomer.service';
import { CreateVendorService } from '@/modules/Vendors/commands/CreateVendor.service';
import { CreateItemService } from '@/modules/Items/CreateItem.service';
import { CreateSaleInvoice } from '@/modules/SaleInvoices/commands/CreateSaleInvoice.service';
import { CreatePaymentReceivedService } from '@/modules/PaymentReceived/commands/CreatePaymentReceived.serivce';
import { CreateExpense } from '@/modules/Expenses/commands/CreateExpense.service';
import { CreateBill } from '@/modules/Bills/commands/CreateBill.service';
import { Account } from '@/modules/Accounts/models/Account.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import {
  DemoDataset,
  DemoIndustry,
  datasetForIndustry,
} from '../data';

@Injectable()
export class SeedOneClickDemoDataService {
  constructor(
    private readonly createCustomerService: CreateCustomer,
    private readonly createVendorService: CreateVendorService,
    private readonly createItemService: CreateItemService,
    private readonly createSaleInvoiceService: CreateSaleInvoice,
    private readonly createPaymentReceivedService: CreatePaymentReceivedService,
    private readonly createExpenseService: CreateExpense,
    private readonly createBillService: CreateBill,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  /**
   * Наполняет демо-организацию так, чтобы в ней было что смотреть:
   * покупатели, поставщики, товары и услуги, счета, оплаты и расходы
   * (Д2 карты v18, расширено FIN-027 ТЗ-2).
   *
   * Пустая демо-организация бесполезна — человек заходит «посмотреть
   * продукт» и видит пустые списки. Данные создаются обычными службами, а
   * не вставкой в базу: так демо проходит те же проверки и получает те же
   * проводки, что настоящая работа.
   *
   * НАБОР ЗАВИСИТ ОТ ОТРАСЛИ. У оптовика и у бухгалтера-одиночки разные
   * контрагенты, разные суммы и разные беды, и чужой пример не узнаётся
   * как свой.
   *
   * @param {string} baseCurrency - Базовая валюта демо-организации.
   * @param {DemoIndustry|string} [industry] - Отрасль набора.
   */
  public async seedDemoData(
    baseCurrency = 'RUB',
    industry?: DemoIndustry | string,
  ): Promise<void> {
    const dataset = datasetForIndustry(industry as string);

    const [incomeAccount, costAccount, bankAccount] = await Promise.all([
      this.accountBySlug('sales-of-product-income'),
      this.accountBySlug('cost-of-goods-sold'),
      this.accountBySlug('bank-account'),
    ]);
    const customerIds = await this.seedCustomers(dataset, baseCurrency);
    const itemIds = await this.seedItems(
      dataset,
      incomeAccount?.id,
      costAccount?.id,
    );

    // Счета — только если и покупатели, и товары действительно созданы:
    // счёт без позиции не имеет смысла и упадёт на проверке.
    if (!customerIds.length || !itemIds.length) return;

    const invoiceIds = await this.seedInvoices(dataset, customerIds, itemIds);

    // Деньги двигаются только когда есть и что оплачивать, и куда класть
    // (С3 карты v29). Без расчётного счёта демо остаётся с одними счетами
    // покупателям — это лучше, чем уронить постройку организации.
    if (!invoiceIds.length || !bankAccount?.id) return;

    await this.seedPayments(dataset, customerIds, invoiceIds, bankAccount.id);
    await this.seedExpenses(dataset, bankAccount.id);

    // БУДУЩИЙ КАССОВЫЙ РАЗРЫВ (приёмка 2 FIN-027). Неоплаченные счета
    // поставщиков с ближним сроком уводят прогноз в минус — без этого
    // виджет денег и платёжный календарь показывают ровную линию и не
    // объясняют, зачем они нужны.
    const vendorIds = await this.seedVendors(dataset, baseCurrency);
    await this.seedBills(dataset, vendorIds, itemIds);
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
  private async seedCustomers(
    dataset: DemoDataset,
    currencyCode: string,
  ): Promise<number[]> {
    const ids: number[] = [];

    for (const customer of dataset.customers) {
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
   * Создаёт демо-поставщиков (FIN-027).
   *
   * Без них нельзя завести счёт поставщика, а без него — показать будущую
   * выплату и разрыв. Сбой отдельного поставщика не роняет постройку:
   * демо без счетов поставщиков всё же лучше пустого демо.
   */
  private async seedVendors(
    dataset: DemoDataset,
    currencyCode: string,
  ): Promise<number[]> {
    const ids: number[] = [];

    for (const vendor of dataset.vendors) {
      try {
        const created: any = await this.createVendorService.createVendor({
          currencyCode,
          displayName: vendor.displayName,
          companyName: vendor.companyName,
          email: vendor.email,
          workPhone: vendor.workPhone,
          active: true,
        } as any);

        if (created?.id) ids.push(created.id);
      } catch (error) {
        console.error('Failed to seed the demo vendor:', error);
      }
    }
    return ids;
  }

  /**
   * Создаёт демо-товары и услуги.
   * @returns {Promise<number[]>} Идентификаторы созданных позиций.
   */
  private async seedItems(
    dataset: DemoDataset,
    sellAccountId?: number,
    costAccountId?: number,
  ): Promise<number[]> {
    // Без счёта доходов товар не создать — а он приходит из плана счетов
    // при сборке организации. Если его нет, лучше оставить демо без
    // товаров, чем уронить всю постройку.
    if (!sellAccountId) return [];

    const ids: number[] = [];

    for (const item of dataset.items) {
      const id = await this.createItemService.createItem({
        name: item.name,
        type: item.type,
        code: item.code,
        sellable: true,
        sellPrice: item.sellPrice,
        sellAccountId,
        sellDescription: item.description,
        purchasable: Boolean(costAccountId),
        ...(costAccountId ? { costPrice: item.costPrice, costAccountId } : {}),
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
    dataset: DemoDataset,
    customerIds: number[],
    itemIds: number[],
  ): Promise<number[]> {
    const ids: number[] = [];

    for (const invoice of dataset.invoices) {
      const customerId = customerIds[invoice.customerIndex % customerIds.length];

      const entries = invoice.entries.map((entry, index) => ({
        index: index + 1,
        itemId: itemIds[entry.itemIndex % itemIds.length],
        quantity: entry.quantity,
        rate: entry.rate,
        description: entry.description,
      }));

      const created: any = await this.createSaleInvoiceService.createSaleInvoice(
        {
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
        } as any,
      );

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
    dataset: DemoDataset,
    customerIds: number[],
    invoiceIds: number[],
    depositAccountId: number,
  ): Promise<void> {
    for (const payment of dataset.payments) {
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
  private async seedExpenses(
    dataset: DemoDataset,
    paymentAccountId: number,
  ): Promise<void> {
    for (const expense of dataset.expenses) {
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

  /**
   * Создаёт неоплаченные счета поставщиков с БУДУЩИМ сроком (FIN-027).
   *
   * Они и дают кассовый разрыв впереди: платёжный календарь вычитает их из
   * остатка в день срока, и остаток уходит в минус. Счёт заводится
   * открытым (`open`) — иначе он останется черновиком и в прогноз не
   * попадёт вовсе.
   */
  private async seedBills(
    dataset: DemoDataset,
    vendorIds: number[],
    itemIds: number[],
  ): Promise<void> {
    if (!vendorIds.length || !itemIds.length) return;

    for (const bill of dataset.bills) {
      const vendorId = vendorIds[bill.vendorIndex % vendorIds.length];
      const itemId = itemIds[bill.itemIndex % itemIds.length];

      try {
        await this.createBillService.createBill({
          vendorId,
          billNumber: bill.billNumber,
          billDate: moment().format('YYYY-MM-DD'),
          dueDate: moment().add(bill.dueInDays, 'days').format('YYYY-MM-DD'),
          note: bill.note,
          open: true,
          entries: [
            {
              index: 1,
              itemId,
              quantity: 1,
              rate: bill.amount,
              description: bill.note,
            },
          ],
        } as any);
      } catch (error) {
        // Демо без одного счёта поставщика лучше, чем демо, которое не
        // построилось: организация уже готова, человек вот-вот войдёт.
        console.error('Failed to seed the demo bill:', error);
      }
    }
  }
}
