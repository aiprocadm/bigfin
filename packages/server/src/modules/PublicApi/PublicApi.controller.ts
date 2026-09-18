// © 2026 Bigfin
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { PreferencesAction } from '@/modules/Settings/Settings.types';

import { ApiTokensApplication } from './ApiTokens.application';
import { WebhooksApplication } from './Webhooks.application';
import { CreateApiTokenDto, CreateWebhookDto, EditWebhookDto } from './dtos/PublicApi.dto';

/**
 * Настройки публичного API: токены и вебхуки (этап 15 ТЗ).
 *
 * Всё здесь — настройки организации, поэтому право на запись то же, что у
 * прочих настроек. Пометка права идёт ВМЕСТЕ со стражем `PermissionGuard`:
 * одна пометка без стража — «мнимая защита», выглядит закрытым, а не
 * проверяется никем. За обоими правилами следят сторожа
 * `Roles/writeEndpointsCoverage.spec.ts` и `Roles/accessGates.spec.ts`.
 */
@ApiTags('Public API')
@Controller('public-api')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class PublicApiController {
  constructor(
    private readonly apiTokens: ApiTokensApplication,
    private readonly webhooks: WebhooksApplication,
  ) {}

  @Get('scopes')
  @ApiOperation({ summary: 'Какие права можно выдать токену.' })
  getScopes() {
    return this.apiTokens.getAvailableScopes();
  }

  @Get('events')
  @ApiOperation({ summary: 'На какие события можно подписаться.' })
  getEvents() {
    return this.webhooks.getAvailableEvents();
  }

  @Get('tokens')
  @ApiOperation({ summary: 'Список токенов организации.' })
  @ApiResponse({
    status: 200,
    description:
      'Самих токенов в ответе нет и быть не может: в базе лежит только ' +
      'отпечаток. Виден хвост — по нему человек узнаёт свой токен.',
  })
  getApiTokens() {
    return this.apiTokens.getApiTokens();
  }

  @Post('tokens')
  @ApiOperation({ summary: 'Выпустить токен.' })
  @ApiResponse({
    status: 201,
    description:
      'Токен возвращается ЕДИНСТВЕННЫЙ раз. Потерял — выпусти новый ' +
      'и отзови старый.',
  })
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  createApiToken(@Body() dto: CreateApiTokenDto) {
    return this.apiTokens.createApiToken(dto);
  }

  @Delete('tokens/:id')
  @ApiOperation({ summary: 'Отозвать токен.' })
  @ApiResponse({
    status: 200,
    description:
      'Отзыв, а не удаление: удалённый токен исчез бы из журнала вместе ' +
      'с ответом на вопрос, кто и когда им пользовался.',
  })
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  revokeApiToken(@Param('id') id: string) {
    return this.apiTokens.revokeApiToken(Number(id));
  }

  @Get('webhooks')
  @ApiOperation({ summary: 'Список подписок на вебхуки.' })
  getWebhooks() {
    return this.webhooks.getWebhooks();
  }

  @Post('webhooks')
  @ApiOperation({ summary: 'Подписаться на событие.' })
  @ApiResponse({
    status: 201,
    description:
      'Секрет подписи возвращается один раз: по нему получатель отличает ' +
      'наш вызов от подделки.',
  })
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  createWebhook(@Body() dto: CreateWebhookDto) {
    return this.webhooks.createWebhook(dto);
  }

  @Put('webhooks/:id')
  @ApiOperation({ summary: 'Изменить подписку.' })
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  editWebhook(@Param('id') id: string, @Body() dto: EditWebhookDto) {
    return this.webhooks.editWebhook(Number(id), dto);
  }

  @Delete('webhooks/:id')
  @ApiOperation({ summary: 'Удалить подписку вместе с её журналом доставок.' })
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  deleteWebhook(@Param('id') id: string) {
    return this.webhooks.deleteWebhook(Number(id));
  }

  @Get('webhooks/:id/deliveries')
  @ApiOperation({
    summary: 'Журнал доставок: почему событие не пришло получателю.',
  })
  getDeliveries(@Param('id') id: string) {
    return this.webhooks.getDeliveries(Number(id));
  }
}
