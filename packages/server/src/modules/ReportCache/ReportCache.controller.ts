// © 2026 Bigfin
import { BadRequestException, Body, Controller, Get, Headers, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClsService } from 'nestjs-cls';

import { RebuildReportService } from './RebuildReport.service';

/**
 * «Пересобрать отчёт» (FT-093 ТЗ-3).
 *
 * Своих прав у ручек нет намеренно: пересчёт — это запрос самого отчёта тем же
 * входом, и права на отчёт проверяет он. Сама пересборка только сбрасывает кэш
 * своей организации — это не меняет данных и не открывает чужих.
 */
@ApiTags('Reports')
@Controller('reports/cache')
export class ReportCacheController {
  constructor(
    private readonly rebuild: RebuildReportService,
    private readonly cls: ClsService,
  ) {}

  @Post('rebuild')
  @ApiOperation({ summary: 'Сбросить кэш и пересчитать отчёт в фоне; ответ — номер пересборки.' })
  async start(
    @Body('path') path: string,
    @Body('query') query: Record<string, unknown>,
    @Headers('authorization') authorization: string | undefined,
    @Headers('accept-language') acceptLanguage: string | undefined,
  ) {
    const result = await this.rebuild.start(path, query ?? {}, {
      authorization,
      organizationId: String(this.cls.get('organizationId') ?? ''),
      acceptLanguage,
    });
    if ('error' in result) {
      throw new BadRequestException({ errors: [{ type: 'REPORT_REBUILD_BAD_PATH', message: result.error }] });
    }
    return { data: result };
  }

  @Get('rebuild/:id')
  @ApiOperation({ summary: 'Где сейчас пересборка: шаг и проценты.' })
  async progress(@Param('id') id: string) {
    const progress = await this.rebuild.progress(id);
    if (!progress) throw new NotFoundException({ errors: [{ type: 'REPORT_REBUILD_NOT_FOUND', message: 'Пересборка не найдена или давно завершилась.' }] });
    return { data: progress };
  }
}
