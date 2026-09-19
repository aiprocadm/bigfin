import { Inject, Injectable } from '@nestjs/common';
import { ERRORS } from '../constants';
import { PaymentReceiveTransfromer } from './PaymentReceivedTransformer';
import { PaymentReceived } from '../models/PaymentReceived';
import { TransformerInjectable } from '../../Transformer/TransformerInjectable.service';
import { ServiceError } from '../../Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';


/**
 * Поступление ВМЕСТЕ с тем, что дописывает преобразователь ответа.
 *
 * Метод объявлял, что возвращает запись из базы, а возвращает её
 * преобразованный вид: форматы сумм и дат дописывает
 * `PaymentReceivedTransformer`. Из-за этого печатная форма читала поля
 * «вслепую» — проверка типов не могла сказать о них ни слова.
 *
 * Описаны те, что и правда читаются кодом.
 */
export type PaymentReceivedWithFormatted = PaymentReceived & {
  subtotalFormatted: string;
  formattedPaymentDate: string;
  formattedAmount: string;
  formattedCreatedAt: string;
  formattedExchangeRate: string;

  // Связи, которые подтягивает сам запрос (`withGraphFetched`). В модели их
  // нет: там объявлены только колонки таблицы.
  customer: Record<string, any>;
  entries: Array<{
    invoice: { invoiceNo: string; totalFormatted: string };
    paymentAmountFormatted: string;
  }>;
};

@Injectable()
export class GetPaymentReceivedService {
  constructor(
    private readonly transformer: TransformerInjectable,

    @Inject(PaymentReceived.name)
    private readonly paymentReceiveModel: TenantModelProxy<
      typeof PaymentReceived
    >,
  ) {}

  /**
   * Retrieve payment receive details.
   * @param {number} paymentReceiveId - Payment receive id.
   * @return {Promise<IPaymentReceived>}
   */
  public async getPaymentReceive(
    paymentReceiveId: number,
  ): Promise<PaymentReceivedWithFormatted> {
    const paymentReceive = await this.paymentReceiveModel()
      .query()
      .withGraphFetched('customer')
      .withGraphFetched('depositAccount')
      .withGraphFetched('entries.invoice')
      .withGraphFetched('transactions')
      .withGraphFetched('branch')
      .withGraphFetched('attachments')
      .findById(paymentReceiveId);

    if (!paymentReceive) {
      throw new ServiceError(ERRORS.PAYMENT_RECEIVE_NOT_EXISTS);
    }
    return this.transformer.transform(
      paymentReceive,
      new PaymentReceiveTransfromer(),
    );
  }
}
