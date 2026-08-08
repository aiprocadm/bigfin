import * as moment from 'moment';
import { omit } from 'lodash';
import * as R from 'ramda';
import * as composeAsync from 'async/compose';
import { ERRORS } from '../constants';
import { ItemsEntriesService } from '@/modules/Items/ItemsEntries.service';
import { ItemEntriesTaxTransactions } from '@/modules/TaxRates/ItemEntriesTaxTransactions.service';
import { BranchTransactionDTOTransformer } from '@/modules/Branches/integrations/BranchTransactionDTOTransform';
import { WarehouseTransactionDTOTransform } from '@/modules/Warehouses/Integrations/WarehouseTransactionDTOTransform';
import { VendorCredit } from '../models/VendorCredit';
import { assocItemEntriesDefaultIndex } from '@/utils/associate-item-entries-index';
import { formatDateFields } from '@/utils/format-date-fields';
import { VendorCreditAutoIncrementService } from './VendorCreditAutoIncrement.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Injectable } from '@nestjs/common';
import {
  CreateVendorCreditDto,
  EditVendorCreditDto,
  VendorCreditEntryDto,
} from '../dtos/VendorCredit.dto';

@Injectable()
export class VendorCreditDTOTransformService {
  /**
   * @param {ItemsEntriesService} itemsEntriesService - The items entries service.
   * @param {BranchTransactionDTOTransformer} branchDTOTransform - The branch transaction DTO transformer.
   * @param {WarehouseTransactionDTOTransform} warehouseDTOTransform - The warehouse transaction DTO transformer.
   * @param {VendorCreditAutoIncrementService} vendorCreditAutoIncrement - The vendor credit auto increment service.
   */
  constructor(
    private itemsEntriesService: ItemsEntriesService,
    private branchDTOTransform: BranchTransactionDTOTransformer,
    private warehouseDTOTransform: WarehouseTransactionDTOTransform,
    private vendorCreditAutoIncrement: VendorCreditAutoIncrementService,
    private taxDTOTransformer: ItemEntriesTaxTransactions,
  ) { }

  /**
   * Transforms the credit/edit vendor credit DTO to model.
   * @param {IVendorCreditCreateDTO | IVendorCreditEditDTO} vendorCreditDTO
   * @param {string} vendorCurrencyCode -
   * @param {IVendorCredit} oldVendorCredit -
   * @returns {VendorCredit}
   */
  public transformCreateEditDTOToModel = async (
    vendorCreditDTO: CreateVendorCreditDto | EditVendorCreditDto,
    vendorCurrencyCode: string,
    oldVendorCredit?: VendorCredit,
  ): Promise<VendorCredit> => {
    // Calculates the total amount of items entries.
    const amount = this.itemsEntriesService.getTotalItemsEntries(
      vendorCreditDTO.entries,
    );
    const initialEntries = vendorCreditDTO.entries.map(
      (entry: VendorCreditEntryDto) => ({
        referenceType: 'VendorCredit',
        // Признак «НДС в цене» задаётся документом и спускается в позиции.
        isInclusiveTax: vendorCreditDTO.isInclusiveTax,
        ...entry,
      }),
    );
    // Ставку налога подставляем в позиции ДО расчёта налога документа: без
    // этого шага у позиции нет процента и налог считается нулём (грабля
    // среза 2).
    const entriesWithTax = await composeAsync(
      this.taxDTOTransformer.assocTaxRateFromTaxIdToEntries,
      this.taxDTOTransformer.assocTaxRateIdFromCodeToEntries,
    )(initialEntries);

    const entries = R.compose(
      // Remove tax code from entries.
      R.map(R.omit(['taxCode'])),

      // Associate the default index to each item entry.
      assocItemEntriesDefaultIndex,
    )(entriesWithTax);

    // Retreive the next vendor credit number.
    const autoNextNumber =
      await this.vendorCreditAutoIncrement.getNextCreditNumber();

    // Detarmines the credit note number.
    const vendorCreditNumber =
      vendorCreditDTO.vendorCreditNumber ||
      oldVendorCredit?.vendorCreditNumber ||
      autoNextNumber;

    const initialDTO = {
      ...formatDateFields(
        omit(vendorCreditDTO, ['open', 'attachments']),
        ['vendorCreditDate'],
      ),
      amount,
      currencyCode: vendorCurrencyCode,
      exchangeRate: vendorCreditDTO.exchangeRate || 1,
      vendorCreditNumber,
      entries,
      ...(vendorCreditDTO.open &&
        !oldVendorCredit?.openedAt && {
        openedAt: moment().toMySqlDateTime(),
      }),
    };
    const asyncDto = (await composeAsync(
      this.branchDTOTransform.transformDTO<VendorCredit>,
      this.warehouseDTOTransform.transformDTO<VendorCredit>,
    )(initialDTO)) as VendorCredit;

    // Налог документа = сумма налогов позиций: без него возврат не уменьшал
    // принятый к вычету НДС.
    return this.taxDTOTransformer.assocTaxAmountWithheldFromEntries(
      asyncDto,
    ) as VendorCredit;
  };

  /**
   * Validate the credit note remaining amount.
   * @param {ICreditNote} creditNote
   * @param {number} amount
   */
  public validateCreditRemainingAmount = (
    vendorCredit: VendorCredit,
    amount: number,
  ) => {
    if (vendorCredit.creditsRemaining < amount) {
      throw new ServiceError(ERRORS.VENDOR_CREDIT_HAS_NO_REMAINING_AMOUNT);
    }
  };
}
