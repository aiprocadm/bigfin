import * as xlsx from 'xlsx';
import { get } from 'lodash';
import { Injectable } from '@nestjs/common';
import { ExportResourceService } from './ExportService';
import { ExportAls } from './ExportAls';
import { ResourceService } from '@/modules/Resource/ResourceService';
import { getExportableServiceNames } from './decorators/ExportableModel.decorator';
import { getDataAccessor } from './utils';

/**
 * «Выгрузить всё» — одна xlsx-книга, лист на каждый экспортируемый ресурс
 * (С3 карты v14). Владение данными: до этого владелец мог забирать данные
 * только по одному списку за раз, вручную.
 *
 * Сломанный ресурс не роняет всю книгу — он честно попадает в лист «Skipped»
 * (молчаливое сокращение выгрузки выглядело бы как «выгружено всё»).
 */
@Injectable()
export class ExportAllService {
  constructor(
    private readonly exportService: ExportResourceService,
    private readonly resourceService: ResourceService,
    private readonly exportAls?: ExportAls,
  ) {}

  public async exportAll(
    resourceNames: string[] = getExportableServiceNames(),
  ): Promise<Buffer> {
    // Тот же контекст «идёт экспорт», что и у одиночной выгрузки.
    if (this.exportAls) {
      return this.exportAls.run(() => this.exportAllRun(resourceNames));
    }
    return this.exportAllRun(resourceNames);
  }

  private async exportAllRun(resourceNames: string[]): Promise<Buffer> {
    const workbook = xlsx.utils.book_new();
    const skipped: string[] = [];

    for (const resource of resourceNames) {
      try {
        const meta: any = this.resourceService.getResourceMeta(resource);
        if (!meta?.exportable || !meta?.columns) {
          skipped.push(resource);
          continue;
        }
        const columns = this.exportService.getExportableColumns(
          this.resourceService.getResourceColumns(resource),
        );
        const data = await this.exportService.getExportableData(resource);
        const transformed = this.exportService.transformExportedData(
          resource,
          data,
        );
        const rows = transformed.map((item: any) =>
          columns.map((col: any) => get(item, getDataAccessor(col))),
        );
        rows.unshift(columns.map((col: any) => col.name));

        const worksheet = xlsx.utils.aoa_to_sheet(rows);
        xlsx.utils.book_append_sheet(
          workbook,
          worksheet,
          this.sheetName(resource),
        );
      } catch (error) {
        skipped.push(resource);
      }
    }
    if (skipped.length > 0) {
      const sheet = xlsx.utils.aoa_to_sheet([
        ['Resource'],
        ...skipped.map((name) => [name]),
      ]);
      xlsx.utils.book_append_sheet(workbook, sheet, 'Skipped');
    }
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Имя листа: CamelCase → слова, без технического суффикса «Model»,
   * не длиннее 31 символа (лимит xlsx).
   */
  private sheetName(resource: string): string {
    return resource
      .replace(/Model$/, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .slice(0, 31);
  }
}
