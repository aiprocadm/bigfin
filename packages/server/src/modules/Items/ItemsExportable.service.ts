import { Global, Injectable } from '@nestjs/common';
import { Exportable } from '../Export/Exportable';
import { EXPORT_ROWS_LIMIT } from '../Export/exportRowsLimit';
import { ItemsApplicationService } from './ItemsApplication.service';
import { IItemsFilter } from './types/Items.types';
import { ExportableService } from '../Export/decorators/ExportableModel.decorator';
import { Item } from './models/Item';

@Injectable()
@ExportableService({ name: Item.name })
@Global()
export class ItemsExportable extends Exportable {
  constructor(
    private readonly itemsApplication: ItemsApplicationService,
  ) {
    super();
  }

  /**
   * Retrieves the accounts data to exportable sheet.
   * @param {IItemsFilter} query - Items export query.
   */
  public exportable(query: IItemsFilter) {
    const parsedQuery = {
      sortOrder: 'DESC',
      columnSortBy: 'created_at',
      page: 1,
      ...query,
      pageSize: EXPORT_ROWS_LIMIT + 1,
    } as IItemsFilter;

    return this.itemsApplication
      .getItems(parsedQuery)
      .then((output) => output.items);
  }
}