import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BankApiSyncApplication } from './BankApiSync.application';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';

class ConnectTinkoffDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

class ImportTinkoffDto {
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
export class BankApiSyncController {
  constructor(private readonly app: BankApiSyncApplication) {}

  @Get('status')
  @ApiOperation({ summary: 'Статус подключения банковских API.' })
  status() {
    return this.app.status();
  }

  @Post('tinkoff/connect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Подключить Тинькофф по токену (только админ).' })
  connect(@Body() dto: ConnectTinkoffDto) {
    return this.app.connectTinkoff(dto.token);
  }

  @Post('tinkoff/disconnect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Отключить Тинькофф (только админ).' })
  disconnect() {
    return this.app.disconnectTinkoff();
  }

  @Post('tinkoff/import')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Импортировать выписку Тинькофф за период (только админ).' })
  import(@Body() dto: ImportTinkoffDto) {
    return this.app.importTinkoffStatement(
      dto.accountId,
      dto.accountNumber,
      dto.currencyCode,
      dto.from,
      dto.to,
    );
  }
}
