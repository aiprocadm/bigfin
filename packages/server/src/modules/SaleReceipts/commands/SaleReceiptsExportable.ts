import { Exportable } from '@/modules/Export/Exportable';
import { Injectable } from '@nestjs/common';
import { SaleReceiptApplication } from '../SaleReceiptApplication.service';
import { EXPORT_ROWS_LIMIT } from '@/modules/Export/exportRowsLimit';
import { GetSaleReceiptsQueryDto } from '../dtos/GetSaleReceiptsQuery.dto';
import { ISortOrder } from '@/modules/DynamicListing/DynamicFilter/DynamicFilter.types';
import { ExportableService } from '@/modules/Export/decorators/ExportableModel.decorator';
import { SaleReceipt } from '../models/SaleReceipt';

@Injectable()
// Без регистрации экспорт чеков отвечал 500 — единственный Exportable без
// пометки (С3 карты v14, вскрыто «выгрузить всё»).
@ExportableService({ name: SaleReceipt.name })
export class SaleReceiptsExportable extends Exportable {
  constructor(private readonly saleReceiptsApp: SaleReceiptApplication) {
    super();
  }

  /**
   * Retrieves the accounts data to exportable sheet.
   * @param {GetSaleReceiptsQueryDto} query -
   */
  public exportable(query: GetSaleReceiptsQueryDto) {
    const filterQuery = (query) => {
      query.withGraphFetched('branch');
      query.withGraphFetched('warehouse');
    };
    const parsedQuery = {
      sortOrder: 'desc' as ISortOrder,
      columnSortBy: 'created_at',
      ...query,
      page: 1,
      pageSize: EXPORT_ROWS_LIMIT + 1,
      filterQuery,
    } as GetSaleReceiptsQueryDto;

    return this.saleReceiptsApp
      .getSaleReceipts(parsedQuery)
      .then((output) => output.data);
  }
}
