import { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Headers, Query, Res } from '@nestjs/common';
import { AcceptType } from '@/constants/accept-type';
import { ExportQuery } from './dtos/ExportQuery.dto';
import { ExportResourceService } from './ExportService';
import { ExportAllService } from './ExportAllService';
import { convertAcceptFormatToFormat } from './Export.utils';

@Controller('/export')
@ApiTags('Export')
export class ExportController {
  constructor(
    private readonly exportResourceApp: ExportResourceService,
    private readonly exportAllService: ExportAllService,
  ) {}

  // Конкретный маршрут объявлен ДО общего @Get() c query-ресурсом.
  @Get('all')
  @ApiOperation({
    summary: 'Exports all exportable resources as one xlsx workbook.',
  })
  async exportAll(@Res({ passthrough: true }) res: Response) {
    const data = await this.exportAllService.exportAll();

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=bigfin-export.xlsx',
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(data);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieves exported the given resource.' })
  async export(
    @Query() query: ExportQuery,
    @Res({ passthrough: true }) res: Response,
    @Headers('accept') acceptHeader: string,
  ) {
    // Заголовка может не быть вовсе, а обычная ссылка из браузера шлёт
    // «звёздочку»: без защиты первый случай ронял ответ пятисотой, второй
    // отдавал 200 с пустым телом (Н2 карты v35). Умолчание — xlsx: именно
    // его просит витрина, и он же ожидаем для ссылки «скачать».
    const requested = acceptHeader || '';
    const accept = requested.includes(AcceptType.ApplicationCsv)
      ? AcceptType.ApplicationCsv
      : requested.includes(AcceptType.ApplicationPdf)
        ? AcceptType.ApplicationPdf
        : AcceptType.ApplicationXlsx;

    const applicationFormat = convertAcceptFormatToFormat(accept);

    const data = await this.exportResourceApp.export(
      query.resource,
      applicationFormat,
    );
    // Retrieves the csv format.
    if (accept.includes(AcceptType.ApplicationCsv)) {
      res.setHeader('Content-Disposition', 'attachment; filename=output.csv');
      res.setHeader('Content-Type', 'text/csv');

      res.send(data);
      // Retrieves the xlsx format.
    } else if (accept.includes(AcceptType.ApplicationXlsx)) {
      res.setHeader('Content-Disposition', 'attachment; filename=output.xlsx');
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.send(data);
      // Retrieve the pdf format.
    } else if (accept.includes(AcceptType.ApplicationPdf)) {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': data.length,
      });
      res.send(data);
    }
  }
}
