import { Inject, Injectable } from '@nestjs/common';
import * as R from 'ramda';
import { sumBy, omit } from 'lodash';
import * as composeAsync from 'async/compose';
import * as moment from 'moment';
import { SaleReceiptIncrement } from './SaleReceiptIncrement.service';
import { ItemsEntriesService } from '@/modules/Items/ItemsEntries.service';
import { BranchTransactionDTOTransformer } from '@/modules/Branches/integrations/BranchTransactionDTOTransform';
import { WarehouseTransactionDTOTransform } from '@/modules/Warehouses/Integrations/WarehouseTransactionDTOTransform';
import { SaleReceiptValidators } from './SaleReceiptValidators.service';
import { BrandingTemplateDTOTransformer } from '@/modules/PdfTemplate/BrandingTemplateDTOTransformer';
import { ItemEntry } from '@/modules/TransactionItemEntry/models/ItemEntry';
import { formatDateFields } from '@/utils/format-date-fields';
import { assocItemEntriesDefaultIndex } from '@/utils/associate-item-entries-index';
import { SaleReceipt } from '../models/SaleReceipt';
import { ItemEntriesTaxTransactions } from '@/modules/TaxRates/ItemEntriesTaxTransactions.service';
import { Customer } from '@/modules/Customers/models/Customer';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { assertValidExchangeRate } from '@/common/validators/assertValidExchangeRate';
import {
  CreateSaleReceiptDto,
  EditSaleReceiptDto,
} from '../dtos/SaleReceipt.dto';

@Injectable()
export class SaleReceiptDTOTransformer {
  /**
   * @param {ItemsEntriesService} itemsEntriesService - Items entries service.
   * @param {BranchTransactionDTOTransformer} branchDTOTransform - Branch transaction DTO transformer.
   * @param {WarehouseTransactionDTOTransform} warehouseDTOTransform - Warehouse transaction DTO transformer.
   * @param {SaleReceiptValidators} validators - Sale receipt validators.
   * @param {SaleReceiptIncrement} receiptIncrement - Sale receipt increment.
   * @param {BrandingTemplateDTOTransformer} brandingTemplatesTransformer - Branding template DTO transformer.
   * @param {typeof ItemEntry} itemEntryModel - Item entry model.
   */
  constructor(
    private readonly itemsEntriesService: ItemsEntriesService,
    private readonly branchDTOTransform: BranchTransactionDTOTransformer,
    private readonly warehouseDTOTransform: WarehouseTransactionDTOTransform,
    private readonly validators: SaleReceiptValidators,
    private readonly receiptIncrement: SaleReceiptIncrement,
    private readonly brandingTemplatesTransformer: BrandingTemplateDTOTransformer,
    private readonly taxDTOTransformer: ItemEntriesTaxTransactions,

    @Inject(ItemEntry.name)
    private readonly itemEntryModel: TenantModelProxy<typeof ItemEntry>,
    private readonly tenancyContext: TenancyContext,
  ) {}

  /**
   * Transform create DTO object to model object.
   * @param {ISaleReceiptDTO} saleReceiptDTO -
   * @param {ISaleReceipt} oldSaleReceipt -
   * @returns {ISaleReceipt}
   */
  async transformDTOToModel(
    saleReceiptDTO: CreateSaleReceiptDto | EditSaleReceiptDto,
    paymentCustomer: Customer,
    oldSaleReceipt?: SaleReceipt,
  ): Promise<SaleReceipt> {
    const amount = sumBy(saleReceiptDTO.entries, (e) =>
      this.itemEntryModel().calcAmount(e),
    );
    // Retrieve the next invoice number.
    const autoNextNumber = await this.receiptIncrement.getNextReceiptNumber();

    // Retrieve the receipt number.
    const receiptNumber =
      saleReceiptDTO.receiptNumber ||
      oldSaleReceipt?.receiptNumber ||
      autoNextNumber;

    // Validate receipt number require.
    this.validators.validateReceiptNoRequire(receiptNumber);

    const initialEntries = saleReceiptDTO.entries.map((entry) => ({
      reference_type: 'SaleReceipt',
      // Признак «НДС в цене» задаётся документом и спускается в позиции —
      // как у счетов покупателям.
      isInclusiveTax: saleReceiptDTO.isInclusiveTax,
      ...entry,
    }));
    const asyncEntries = await composeAsync(
      // Associate tax rate from tax id to entries.
      this.taxDTOTransformer.assocTaxRateFromTaxIdToEntries,
      // Associate tax rate id from tax code to entries.
      this.taxDTOTransformer.assocTaxRateIdFromCodeToEntries,
      // Sets default cost and sell account to receipt items entries.
      this.itemsEntriesService.setItemsEntriesDefaultAccounts,
    )(initialEntries);

    const entries = R.compose(
      // Remove tax code from entries.
      R.map(R.omit(['taxCode'])),

      // Associate the default index for each item entry.
      assocItemEntriesDefaultIndex,
    )(asyncEntries);

    // Чужая валюта требует настоящего курса — иначе «|| 1» ниже молча
    // провёл бы чек по курсу 1 (С4 карты v14).
    const tenantMetadata = await this.tenancyContext.getTenantMetadata();
    assertValidExchangeRate({
      currencyCode: paymentCustomer.currencyCode,
      baseCurrency: tenantMetadata?.baseCurrency,
      exchangeRate: saleReceiptDTO.exchangeRate,
    });
    const initialDTO = {
      amount,
      ...formatDateFields(
        omit(saleReceiptDTO, ['closed', 'entries', 'attachments']),
        ['receiptDate'],
      ),
      currencyCode: paymentCustomer.currencyCode,
      exchangeRate: saleReceiptDTO.exchangeRate || 1,
      receiptNumber,
      // Avoid rewrite the deliver date in edit mode when already published.
      ...(saleReceiptDTO.closed &&
        !oldSaleReceipt?.closedAt && {
          closedAt: moment().toMySqlDateTime(),
        }),
      entries,
    };
    const asyncDto = await composeAsync(
      this.branchDTOTransform.transformDTO<SaleReceipt>,
      this.warehouseDTOTransform.transformDTO<SaleReceipt>,

      // Assigns the default branding template id to the invoice DTO.
      this.brandingTemplatesTransformer.assocDefaultBrandingTemplate(
        'SaleReceipt',
      ),
    )(initialDTO);

    // Налог документа = сумма налогов позиций (как у счетов). Без этого
    // продажа за наличные не попадала в анализ НДС вовсе.
    return R.compose(this.taxDTOTransformer.assocTaxAmountWithheldFromEntries)(
      asyncDto,
    );
  }
}
