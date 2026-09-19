import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CrmWebhookTenantService } from './commands/CrmWebhookTenant.service';
import { CrmSyncService } from './commands/CrmSync.service';
import {
  InboundCrmEntities,
  mapInboundCrmPayload,
} from './connectors/owncrm/mapInbound';
import { OWNCRM_KEY } from './constants';
import { PublicRoute } from '@/modules/Auth/guards/jwt.guard';
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';
import { CrmWebhookTokenQueryDto } from '@/common/dtos/CrmWebhookTokenQuery.dto';

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
    private readonly featuresManager: FeaturesManager,
  ) {}

  @Post('inbound')
  @HttpCode(200)
  @ApiOperation({ summary: 'Входящий webhook собственной CRM (по токену).' })
  async inbound(@Query() query: CrmWebhookTokenQueryDto, @Body() body: any) {
    // Проверку «не передан token» делает вид-описание ДО входа в метод:
    // раньше она стояла здесь и была единственной такой на весь сервер,
    // то есть держалась на внимательности автора.
    const token = query.token;

    // Плохой payload → 400 (а не 500): разбираем ДО входа в тенант-контекст.
    let entities: InboundCrmEntities;
    try {
      entities = mapInboundCrmPayload(body);
    } catch {
      throw new BadRequestException(
        'Некорректный payload. Ожидается { type: contact | deal, externalId, ... }.',
      );
    }

    return this.tenantResolver.resolveAndRun(token, async () => {
      // Гейт флага в контексте тенанта (как у остальных операций CRM).
      const enabled = await this.featuresManager.accessible(
        Features.CRM_INTEGRATION,
      );
      if (!enabled) throw new ForbiddenException('CRM-интеграция выключена');

      return this.sync.importCanonical(OWNCRM_KEY, entities);
    });
  }
}
