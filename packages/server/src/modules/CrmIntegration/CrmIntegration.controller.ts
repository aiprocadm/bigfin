import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CrmIntegrationApplication } from './CrmIntegration.application';
import { ConnectBitrix24Dto } from './dtos/ConnectBitrix24.dto';
import { ConnectAmocrmDto } from './dtos/ConnectAmocrm.dto';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';

@Controller('crm')
@ApiTags('crm')
export class CrmIntegrationController {
  constructor(private readonly app: CrmIntegrationApplication) {}

  @Get('status')
  @ApiOperation({ summary: 'Статус подключения CRM-интеграции.' })
  status() {
    return this.app.status();
  }

  @Post('bitrix24/connect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Подключить Битрикс24 по webhook-URL (только админ).' })
  connectBitrix24(@Body() dto: ConnectBitrix24Dto) {
    return this.app.connectBitrix24(dto.webhookUrl);
  }

  @Post('bitrix24/disconnect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Отключить Битрикс24 (только админ).' })
  disconnectBitrix24() {
    return this.app.disconnectBitrix24();
  }

  @Post('amocrm/connect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Подключить amoCRM (поддомен + токен, только админ).' })
  connectAmocrm(@Body() dto: ConnectAmocrmDto) {
    return this.app.connectAmocrm(dto.subdomain, dto.accessToken);
  }

  @Post('amocrm/disconnect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Отключить amoCRM (только админ).' })
  disconnectAmocrm() {
    return this.app.disconnectAmocrm();
  }

  @Post('sync')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Запустить синхронизацию CRM → Bigfin (только админ).' })
  runSync() {
    return this.app.runSync();
  }
}
