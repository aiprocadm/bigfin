import * as moment from 'moment';
import { Inject, Injectable } from '@nestjs/common';
import { CreateCustomer } from '@/modules/Customers/commands/CreateCustomer.service';
import { CreateItemService } from '@/modules/Items/CreateItem.service';
import { CreateSaleInvoice } from '@/modules/SaleInvoices/commands/CreateSaleInvoice.service';
import { Account } from '@/modules/Accounts/models/Account.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DEMO_CUSTOMERS, DEMO_ITEMS, DEMO_INVOICES } from '../OneClickDemo.data';

@Injectable()
export class SeedOneClickDemoDataService {
  constructor(
    private readonly createCustomerService: CreateCustomer,
    private readonly createItemService: CreateItemService,
    private readonly createSaleInvoiceService: CreateSaleInvoice,

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
    const [incomeAccount, costAccount] = await Promise.all([
      this.accountBySlug('sales-of-product-income'),
      this.accountBySlug('cost-of-goods-sold'),
    ]);
    const customerIds = await this.seedCustomers(baseCurrency);
    const itemIds = await this.seedItems(incomeAccount?.id, costAccount?.id);

    // Счета — только если и покупатели, и товары действительно созданы:
    // счёт без позиции не имеет смысла и упадёт на проверке.
    if (customerIds.length && itemIds.length) {
      await this.seedInvoices(customerIds, itemIds);
    }
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
  ): Promise<void> {
    for (const invoice of DEMO_INVOICES) {
      const customerId = customerIds[invoice.customerIndex % customerIds.length];

      const entries = invoice.entries.map((entry, index) => ({
        index: index + 1,
        itemId: itemIds[entry.itemIndex % itemIds.length],
        quantity: entry.quantity,
        rate: entry.rate,
        description: entry.description,
      }));

      await this.createSaleInvoiceService.createSaleInvoice({
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
    }
  }
}
