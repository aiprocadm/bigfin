import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CrmWebhookTenantService } from './commands/CrmWebhookTenant.service';
import { CrmSyncService } from './commands/CrmSync.service';
import { mapInboundCrmPayload } from './connectors/owncrm/mapInbound';
import { OWNCRM_KEY } from './constants';
import { PublicRoute } from '@/modules/Auth/guards/jwt.guard';

/**
 * Публичный приёмник входящих webhook собственной CRM (⑯c). Без auth-сессии:
 * тенант определяется по токену (системная таблица `crm_webhook_tokens`),
 * затем сущность создаётся в контексте этого тенанта тем же контрактом, что
 * Битрикс/amoCRM.
 */
@Controller('crm/webhooks')
@ApiTags('crm')
@PublicRoute()
export class CrmWebhooksController {
  constructor(
    private readonly tenantResolver: CrmWebhookTenantService,
    private readonly sync: CrmSyncService,
  ) {}

  @Post('inbound')
  @HttpCode(200)
  @ApiOperation({ summary: 'Входящий webhook собственной CRM (по токену).' })
  async inbound(@Query('token') token: string, @Body() body: any) {
    if (!token) throw new BadRequestException('Не передан token.');

    return this.tenantResolver.resolveAndRun(token, () => {
      const entities = mapInboundCrmPayload(body);
      return this.sync.importCanonical(OWNCRM_KEY, entities);
    });
  }
}
