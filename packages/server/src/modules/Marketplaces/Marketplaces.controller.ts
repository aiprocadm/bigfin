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
}
