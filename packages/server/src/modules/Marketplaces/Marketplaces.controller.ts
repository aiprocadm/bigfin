import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { MarketplacesApplication } from './Marketplaces.application';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';

class ConnectWbDto {
  @IsString()
  @IsNotEmpty()
  apiKey: string;
}

/** Ozon авторизует парой: идентификатор кабинета + ключ. */
class ConnectOzonDto {
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  apiKey: string;
}

@Controller('marketplaces')
@ApiTags('marketplaces')
export class MarketplacesController {
  constructor(private readonly app: MarketplacesApplication) {}

  @Get('status')
  @ApiOperation({ summary: 'Статус подключения маркетплейсов.' })
  status() {
    return this.app.status();
  }

  @Get('wildberries/summary')
  @ApiOperation({ summary: 'Финансовая сводка Wildberries за период.' })
  wbSummary(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.app.wildberriesSummary(fromDate, toDate);
  }

  @Post('wildberries/connect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Подключить Wildberries по API-ключу (только админ).' })
  connectWb(@Body() dto: ConnectWbDto) {
    return this.app.connectWildberries(dto.apiKey);
  }

  @Post('wildberries/disconnect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Отключить Wildberries (только админ).' })
  disconnectWb() {
    return this.app.disconnectWildberries();
  }

  @Get('ozon/summary')
  @ApiOperation({ summary: 'Финансовая сводка Ozon за период.' })
  ozonSummary(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.app.ozonSummary(fromDate, toDate);
  }

  @Post('ozon/connect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Подключить Ozon по Client-Id и Api-Key (только админ).' })
  connectOzon(@Body() dto: ConnectOzonDto) {
    return this.app.connectOzon(dto.clientId, dto.apiKey);
  }

  @Post('ozon/disconnect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Отключить Ozon (только админ).' })
  disconnectOzon() {
    return this.app.disconnectOzon();
  }
}
