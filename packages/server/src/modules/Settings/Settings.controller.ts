import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SettingsApplicationService } from './SettingsApplication.service';
import { ISettingsDTO, PreferencesAction } from './Settings.types';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { DisplayPreferencesService } from './queries/DisplayPreferences.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

@Controller('settings')
@ApiTags('Settings')
@UseGuards(AuthorizationGuard, PermissionGuard)
export class SettingsController {
  constructor(
    private readonly settingsApplicationService: SettingsApplicationService,
    private readonly displayPreferences: DisplayPreferencesService,
    private readonly tenancyContext: TenancyContext,
  ) {}

  /**
   * Личные настройки отображения (FIN-026 ТЗ-2).
   *
   * Без права на изменение настроек организации: это настройка ЧЕЛОВЕКА, а
   * не компании. Запретить её тому, кто просто смотрит отчёты, значило бы
   * заставить его читать копейки, которых он видеть не хочет.
   */
  @Get('display-preferences')
  @ApiOperation({ summary: 'Личные настройки отображения.' })
  async getDisplayPreferences() {
    const user: any = await this.tenancyContext.getSystemUser();

    return this.displayPreferences.getPreferences(user?.id);
  }

  @Put('display-preferences')
  @ApiOperation({ summary: 'Сохранить личные настройки отображения.' })
  async saveDisplayPreferences(@Body() values: Record<string, unknown>) {
    const user: any = await this.tenancyContext.getSystemUser();

    return this.displayPreferences.setPreferences(user?.id, values);
  }

  @Put()
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Save the given settings.' })
  async saveSettings(@Body() settingsDTO: ISettingsDTO) {
    return this.settingsApplicationService.saveSettings(settingsDTO);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieves the settings.' })
  async getSettings() {
    return this.settingsApplicationService.getSettings();
  }
}
