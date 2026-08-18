import { Injectable } from '@nestjs/common';
import * as R from 'ramda';
import { omit, sumBy } from 'lodash';
import { formatDateFields } from '@/utils/format-date-fields';
import { assocItemEntriesDefaultIndex } from '@/utils/associate-item-entries-index';
import { BranchTransactionDTOTransformer } from '@/modules/Branches/integrations/BranchTransactionDTOTransform';
import { Vendor } from '@/modules/Vendors/models/Vendor';
import { BillPayment } from '../models/BillPayment';
import {
  CreateBillPaymentDto,
  EditBillPaymentDto,
} from '../dtos/BillPayment.dto';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { assertValidExchangeRate } from '@/common/validators/assertValidExchangeRate';

@Injectable()
export class CommandBillPaymentDTOTransformer {
  constructor(
    private readonly branchDTOTransform: BranchTransactionDTOTransformer,
    private readonly tenancyContext: TenancyContext,
  ) {}

  /**
   * Transforms create/edit DTO to model.
   * @param {number} tenantId
   * @param {IBillPaymentDTO} billPaymentDTO - Bill payment.
   * @param {IBillPayment} oldBillPayment - Old bill payment.
   * @return {Promise<IBillPayment>}
   */
  public async transformDTOToModel(
    billPaymentDTO: CreateBillPaymentDto | EditBillPaymentDto,
    vendor: Vendor,
    oldBillPayment?: BillPayment,
  ): Promise<BillPayment> {
    const amount =
      billPaymentDTO.amount ?? sumBy(billPaymentDTO.entries, 'paymentAmount');

    // Чужая валюта требует настоящего курса — иначе «|| 1» ниже молча
    // провёл бы оплату по курсу 1 (С4 карты v14).
    const tenantMetadata = await this.tenancyContext.getTenantMetadata();
    assertValidExchangeRate({
      currencyCode: vendor.currencyCode,
      baseCurrency: tenantMetadata?.baseCurrency,
      exchangeRate: billPaymentDTO.exchangeRate,
    });

    // Associate the default index to each item entry.
    const entries = R.compose(
      // Associate the default index to payment entries.
      assocItemEntriesDefaultIndex,
    )(billPaymentDTO.entries);

    const initialDTO = {
      ...formatDateFields(omit(billPaymentDTO, ['attachments']), [
        'paymentDate',
      ]),
      amount,
      currencyCode: vendor.currencyCode,
      exchangeRate: billPaymentDTO.exchangeRate || 1,
      entries,
    };
    return R.compose(this.branchDTOTransform.transformDTO<BillPayment>)(
      initialDTO,
    );
  }
}
