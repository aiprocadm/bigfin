// © 2026 Bigfin
import 'reflect-metadata';
import { PaymentLinksController } from './PaymentLinks.controller';
import { CreateInvoiceCheckoutSession } from './CreateInvoiceCheckoutSession';
import { IS_PUBLIC_ROUTE } from '../Auth/Auth.constants';

/**
 * Шаг В4 карты v9: оплата счёта по ссылке — поток для ПОКУПАТЕЛЯ снаружи.
 *
 * Ссылку открывает человек без входа в систему: он видит счёт и платит.
 * Раньше ручки лежали за входом, и покупатель получал 401 — поток был
 * нерабочим. Организация при этом ищется не по заголовку, а по самой ссылке.
 */
describe('оплата счёта по ссылке доступна без входа', () => {
  it('контроллер помечен публичным', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_ROUTE, PaymentLinksController),
    ).toBe(true);
  });
});

describe('создание сессии оплаты', () => {
  const buildService = () => {
    const order: string[] = [];

    const paymentLinkModel = {
      query: () => ({
        findOne: () => ({
          where: () => ({
            throwIfNotFound: () =>
              Promise.resolve({ id: 1, tenantId: 5, resourceId: 9 }),
          }),
        }),
      }),
    };

    const systemTenantModel = {
      query: () => ({
        findById: async () => {
          order.push('тенант загружен');
          return { organizationId: 'org-x' };
        },
      }),
    };

    const clsService = {
      set: (key: string, value: string) => {
        order.push(`cls: ${key}=${value}`);
      },
    };

    const saleInvoiceModel = () => {
      order.push('обращение к тенантной модели');
      return {
        query: () => ({
          findById: () => ({
            withGraphFetched: function () {
              return this;
            },
            throwIfNotFound: () =>
              Promise.resolve({ id: 9, paymentMethods: [] }),
          }),
        }),
      };
    };

    const stripePaymentService = {
      stripe: {},
      createCheckoutSession: async () => ({ id: 'sess', url: 'http://x' }),
    };

    const service = new CreateInvoiceCheckoutSession(
      stripePaymentService as any,
      { get: () => 'pk' } as any,
      saleInvoiceModel as any,
      paymentLinkModel as any,
      systemTenantModel as any,
      clsService as any,
    );

    return { service, order };
  };

  it('организация кладётся в контекст ДО обращения к счёту', async () => {
    const { service, order } = buildService();

    // Сессию Stripe в юните не собрать — важен только порядок начала работы.
    await service.createInvoiceCheckoutSession('link-1').catch(() => undefined);

    const clsIndex = order.indexOf('cls: organizationId=org-x');
    const tenantModelIndex = order.indexOf('обращение к тенантной модели');

    expect(clsIndex).toBeGreaterThanOrEqual(0);
    expect(tenantModelIndex).toBeGreaterThanOrEqual(0);
    // Без этого публичный вызов падает: у запроса нет заголовка организации,
    // и тенантное подключение обязано настроиться из самой ссылки.
    expect(clsIndex).toBeLessThan(tenantModelIndex);
  });
});
