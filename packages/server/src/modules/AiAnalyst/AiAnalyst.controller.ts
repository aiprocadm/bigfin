// © 2026 Bigfin
import { RequireAnyPermission } from '@/modules/Roles/RequireAnyPermission.decorator';
import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { PreferencesAction } from '@/modules/Settings/Settings.types';

import { AiAnalystSettingsService } from './AiAnalystSettings.service';
import { AiScope, GetAiInsightsService } from './queries/GetAiInsights.service';
import { EditAiAnalystSettingsDto } from './dtos/AiAnalyst.dto';

/**
 * ИИ-аналитик (этап 13 ТЗ).
 *
 * Пометка права идёт ВМЕСТЕ со стражем `PermissionGuard`: одна пометка без
 * стража — «мнимая защита». За этим следят `writeEndpointsCoverage.spec.ts`
 * и `accessGates.spec.ts`.
 */
@ApiTags('AI Analyst')
@Controller('ai-analyst')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class AiAnalystController {
  constructor(
    private readonly insights: GetAiInsightsService,
    private readonly settings: AiAnalystSettingsService,
  ) {}

  @RequireAnyPermission({ ability: 'read-balance-sheet', subject: AbilitySubject.Report }, { ability: 'read-profit-loss', subject: AbilitySubject.Report })
  @Get('availability')
  @ApiOperation({ summary: 'Доступен ли раздел и, если нет, почему именно.' })
  @ApiResponse({
    status: 200,
    description:
      'Причина возвращается всегда: пустой блок «Что говорят цифры» ' +
      'выглядит так же, как блок, которому нечего сказать.',
  })
  getAvailability() {
    return this.insights.getAvailability();
  }

  @RequireAnyPermission({ ability: 'read-balance-sheet', subject: AbilitySubject.Report }, { ability: 'read-profit-loss', subject: AbilitySubject.Report })
  @Get('settings')
  @ApiOperation({ summary: 'Настройки провайдера (без ключа доступа).' })
  async getSettings() {
    const settings = await this.settings.getProviderSettings();

    return {
      provider: settings.provider,
      endpoint: settings.endpoint,
      folderId: settings.folderId,
      model: settings.model,
      // Сам ключ наружу не отдаётся никогда — только признак, что он задан.
      apiKeySet: Boolean(settings.apiKey),
      forbidExternalData: await this.settings.isExternalDataForbidden(),
    };
  }

  @Put('settings')
  @ApiOperation({ summary: 'Сохранить настройки ИИ-аналитика.' })
  @ApiResponse({
    status: 200,
    description:
      'Пустое поле ключа НЕ стирает сохранённый ключ: иначе открытие формы ' +
      'настроек и нажатие «Сохранить» ломали бы рабочую интеграцию.',
  })
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  async saveSettings(@Body() dto: EditAiAnalystSettingsDto) {
    await this.settings.saveSettings(dto);

    return this.getSettings();
  }

  @RequireAnyPermission({ ability: 'read-balance-sheet', subject: AbilitySubject.Report }, { ability: 'read-profit-loss', subject: AbilitySubject.Report })
  @Get('insights/:scope')
  @ApiOperation({ summary: 'Выводы «Что говорят цифры» для экрана.' })
  @ApiResponse({
    status: 200,
    description:
      'Читается только суточный кеш: открытие страницы не ждёт модель ' +
      'и не оплачивает её (§13.3).',
  })
  getInsights(@Param('scope') scope: string) {
    return this.insights.getInsights(scope as AiScope);
  }
}
