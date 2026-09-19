// © 2026 Bigfin
import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { PreferencesAction } from '@/modules/Settings/Settings.types';
import { AbilitySubject } from '@/modules/Roles/Roles.types';

import { GetCapitalizationService } from './queries/GetCapitalization.service';
import { CapitalizationSettingsService } from './CapitalizationSettings.service';
import {
  CapitalizationQueryDto,
  SetProfitMultipleDto,
} from './dtos/Capitalization.dto';

/**
 * «Сколько стоит мой бизнес» (этап 11 ТЗ).
 *
 * Отдельный раздел, а не часть финмодели: это отчёт СОБСТВЕННИКА, и смотрят
 * его не тогда же, когда считают маржу по сделкам.
 */
@Controller('capitalization')
@ApiTags('Capitalization')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class CapitalizationController {
  constructor(
    private readonly capitalization: GetCapitalizationService,
    private readonly settings: CapitalizationSettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Стоимость бизнеса: чистые активы, оценка, доля владельца.' })
  getCapitalization(@Query() query: CapitalizationQueryDto) {
    return this.capitalization.getCapitalization(query);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Настройки оценки: множитель прибыли.' })
  getSettings() {
    return this.settings.getSettings();
  }

  @Put('settings')
  // Множитель меняет ГЛАВНОЕ число отчёта собственника. Право то же, что у
  // прочих настроек организации: это настройка, а не разовое действие.
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Задать множитель прибыли.' })
  async setSettings(@Body() dto: SetProfitMultipleDto) {
    await this.settings.setProfitMultiple(dto.profitMultiple ?? null);

    return this.settings.getSettings();
  }
}
