// © 2026 Bigfin
import { Module } from '@nestjs/common';

import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

import { ApiTokensApplication } from './ApiTokens.application';
import { WebhooksApplication } from './Webhooks.application';
import { PublicApiController } from './PublicApi.controller';

/**
 * Публичный API и вебхуки (этап 15 ТЗ).
 *
 * `TenancyContext` — в providers: токены лежат в системной схеме, и без него
 * не узнать, какой организации принадлежит выпускаемый токен (это стережёт
 * `tenancyModuleImports.spec.ts`).
 */
@Module({
  controllers: [PublicApiController],
  providers: [ApiTokensApplication, WebhooksApplication, TenancyContext],
  exports: [ApiTokensApplication, WebhooksApplication],
})
export class PublicApiModule {}
