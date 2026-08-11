import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BankApiSyncApplication } from './BankApiSync.application';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { FeatureGuard } from '@/modules/Features/Feature.guard';
import { RequireFeature } from '@/modules/Features/RequireFeature.decorator';
import { Features } from '@/common/types/Features';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';

/**
 * Учётные данные банка: у Тинькофф — токен, у Альфы — OAuth-приложение.
 * Поля опциональны в DTO, обязательность проверяет прикладной слой по банку.
 */
class ConnectBankDto {
  @IsString()
  @IsOptional()
  token?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  clientSecret?: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;
}

class ImportStatementDto {
  @IsInt()
  accountId: number;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsOptional()
  currencyCode?: string;

  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  to: string;
}

@Controller('bank-api-sync')
@ApiTags('bank-api-sync')
// Право на этих ручках было объявлено, но исполнять его было некому:
// без стража пометка ничего не значит и запрос проходит.
@UseGuards(AuthorizationGuard, PermissionGuard, FeatureGuard)
@RequireFeature(Features.BANK_API_SYNC)
export class BankApiSyncController {
  constructor(private readonly app: BankApiSyncApplication) {}

  @Get('status')
  @ApiOperation({ summary: 'Статус подключения банковских API.' })
  status() {
    return this.app.status();
  }

  // Параметрические роуты: прежние /tinkoff/* продолжают работать как
  // частный случай, старому фронту ломаться не о что.
  @Post(':provider/connect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Подключить банк по учётным данным (только админ).' })
  connect(@Param('provider') provider: string, @Body() dto: ConnectBankDto) {
    return this.app.connect(provider, { ...dto });
  }

  @Post(':provider/disconnect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Отключить банк (только админ).' })
  disconnect(@Param('provider') provider: string) {
    return this.app.disconnect(provider);
  }

  @Post(':provider/import')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Импортировать выписку банка за период (только админ).' })
  import(
    @Param('provider') provider: string,
    @Body() dto: ImportStatementDto,
  ) {
    return this.app.importStatementFor(
      provider,
      dto.accountId,
      dto.accountNumber,
      dto.currencyCode,
      dto.from,
      dto.to,
    );
  }
}
