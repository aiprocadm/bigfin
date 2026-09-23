// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

import { TableSheet } from '../../common/TableSheet';
import { TableSheetPdf } from '../../common/TableSheetPdf';
import { ManagerialPnlService } from './ManagerialPnlService';
import { ManagerialPnlTable } from './ManagerialPnlTable';
import { ManagerialPnlQueryDto } from './ManagerialPnlQuery.dto';

/**
 * Управленческий ОПиУ во всех форматах. Таблица одна на экран и выгрузки:
 * расхождение между увиденным и выгруженным — отдельный класс жалоб.
 */
@Injectable()
export class ManagerialPnlApplication {
  constructor(
    private readonly service: ManagerialPnlService,
    private readonly i18n: I18nService,
    private readonly tableSheetPdf: TableSheetPdf,
  ) {}

  public sheet(query: ManagerialPnlQueryDto) {
    return this.service.sheet(query);
  }

  public async table(query: ManagerialPnlQueryDto) {
    const { data, meta } = await this.service.sheet(query);
    const table = new ManagerialPnlTable(data, this.i18n, {
      showTotalColumn: query.showTotalColumn,
      showEmpty: query.showEmpty,
    });

    return {
      table: { columns: table.tableColumns(), rows: table.tableData() },
      meta,
      query,
    };
  }

  public async csv(query: ManagerialPnlQueryDto): Promise<string> {
    const { table } = await this.table(query);
    return new TableSheet(table).convertToCSV();
  }

  public async xlsx(query: ManagerialPnlQueryDto): Promise<Buffer> {
    const { table } = await this.table(query);
    const sheet = new TableSheet(table);
    return sheet.convertToBuffer(sheet.convertToXLSX(), 'xlsx');
  }

  public async pdf(query: ManagerialPnlQueryDto): Promise<Buffer> {
    const { table, meta } = await this.table(query);
    return this.tableSheetPdf.convertToPdf(
      table,
      meta.organizationName,
      meta.sheetName,
      meta.formattedDateRange,
    );
  }
}
