import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ClsService } from 'nestjs-cls';
import { TenantAgnosticRoute } from '../Tenancy/TenancyGlobal.guard';
import { IgnoreUserVerifiedRoute } from '../Auth/guards/EnsureUserVerified.guard';
import { TwoFactorSetupService } from './commands/TwoFactorSetup.service';
import { TwoFactorEnableService } from './commands/TwoFactorEnable.service';
import { TwoFactorDisableService } from './commands/TwoFactorDisable.service';
import { TwoFactorRegenerateBackupCodesService } from './commands/TwoFactorRegenerateBackupCodes.service';
import { GetTwoFactorStateService } from './queries/GetTwoFactorState.service';
import {
  TwoFactorBackupCodesResponseDto,
  TwoFactorDisableDto,
  TwoFactorEnableDto,
  TwoFactorRegenerateDto,
  TwoFactorSetupResponseDto,
  TwoFactorStateResponseDto,
} from './dtos/TwoFactor.dtos';

@Controller('/auth/2fa')
@ApiTags('Auth')
@TenantAgnosticRoute()
@IgnoreUserVerifiedRoute()
@Throttle({ auth: {} })
export class TwoFactorController {
  constructor(
    private readonly cls: ClsService,
    private readonly setupService: TwoFactorSetupService,
    private readonly enableService: TwoFactorEnableService,
    private readonly disableService: TwoFactorDisableService,
    private readonly regenerateService: TwoFactorRegenerateBackupCodesService,
    private readonly getStateService: GetTwoFactorStateService,
  ) {}

  private get userId(): number {
    return this.cls.get('userId');
  }

  @Get('/')
  @ApiOperation({ summary: 'Состояние 2FA текущего пользователя' })
  @ApiResponse({ status: 200, type: TwoFactorStateResponseDto })
  async getState(): Promise<TwoFactorStateResponseDto> {
    return this.getStateService.getState(this.userId);
  }

  @Post('/setup')
  @ApiOperation({ summary: 'Начать настройку 2FA (секрет + otpauth-URI)' })
  @ApiResponse({ status: 201, type: TwoFactorSetupResponseDto })
  async setup(): Promise<TwoFactorSetupResponseDto> {
    return this.setupService.setup(this.userId);
  }

  @Post('/enable')
  @ApiOperation({ summary: 'Подтвердить код и включить 2FA' })
  @ApiResponse({ status: 201, type: TwoFactorBackupCodesResponseDto })
  async enable(
    @Body() dto: TwoFactorEnableDto,
  ): Promise<TwoFactorBackupCodesResponseDto> {
    return this.enableService.enable(this.userId, dto.code);
  }

  @Post('/disable')
  @ApiOperation({ summary: 'Отключить 2FA (подтверждение паролем)' })
  async disable(@Body() dto: TwoFactorDisableDto) {
    await this.disableService.disable(this.userId, dto.password);

    return {
      code: 200,
      message: 'Two-factor authentication has been disabled.',
    };
  }

  @Post('/backup-codes/regenerate')
  @ApiOperation({ summary: 'Перегенерировать резервные коды' })
  @ApiResponse({ status: 201, type: TwoFactorBackupCodesResponseDto })
  async regenerate(
    @Body() dto: TwoFactorRegenerateDto,
  ): Promise<TwoFactorBackupCodesResponseDto> {
    return this.regenerateService.regenerate(this.userId, dto.code);
  }
}
