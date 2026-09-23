import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject, ExportAction } from '@/modules/Roles/Roles.types';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetOnecExportService } from './GetOnecExport.service';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';
import { AccountDateRangeQueryDto } from '@/common/dtos/DateRangeQuery.dto';

@Controller('onec-export')
@ApiTags('onec-export')
// Выписка для 1С — все операции по счёту за период: та же выгрузка
// данных, что и Excel, и закрыта тем же правом (FT-082 ТЗ-3).
@UseGuards(AuthorizationGuard, PermissionGuard)
@RequirePermission(ExportAction.Run, AbilitySubject.Export)
export class OnecExportController {
  constructor(
    private readonly getExport: GetOnecExportService,
    private readonly featuresManager: FeaturesManager,
  ) {}

  @Get()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="1c_export.txt"')
  @ApiOperation({ summary: 'Выгрузка операций в формате 1CClientBankExchange.' })
  async export(
    @Query() query: AccountDateRangeQueryDto,
  ): Promise<string> {
    const enabled = await this.featuresManager.accessible(Features.ONEC_EXPORT);
    if (!enabled) throw new ForbiddenException('Выгрузка в 1С выключена');

    return this.getExport.export(query.accountId, query.from, query.to);
  }
}
