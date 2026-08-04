import { Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { I18nService } from 'nestjs-i18n';
import {
  IInventoryDetailsQuery,
  IInventoryItemDetailMeta,
} from './InventoryItemDetails.types';
import { FinancialSheetMeta } from '../../common/FinancialSheetMeta';

@Injectable()
export class InventoryDetailsMetaInjectable {
  constructor(
    private readonly financialSheetMeta: FinancialSheetMeta,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Retrieve the inventoy details meta.
   * @returns {IInventoryItemDetailMeta}
   */
  public async meta(
    query: IInventoryDetailsQuery,
  ): Promise<IInventoryItemDetailMeta> {
    const commonMeta = await this.financialSheetMeta.meta();

    const formattedFromDate = moment(query.fromDate).format(
      commonMeta.dateFormat,
    );
    const formattedToDay = moment(query.toDate).format(commonMeta.dateFormat);
    const formattedDateRange = this.i18n.t('financial_sheet.date_range', {
      args: { from: formattedFromDate, to: formattedToDay },
    });

    const sheetName = 'Inventory Item Details';

    return {
      ...commonMeta,
      sheetName,
      formattedFromDate,
      formattedToDay,
      formattedDateRange,
    };
  }
}
