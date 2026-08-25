import { Global, Module } from '@nestjs/common';
import { TenancyModule } from '../Tenancy/Tenancy.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { OrganizationI18nService } from './OrganizationI18n.service';
import { OrganizationLanguageInterceptor } from './OrganizationLanguage.interceptor';

/**
 * OrganizationI18nModule — делает {@link OrganizationI18nService} доступным
 * во всём приложении.
 *
 * Помечен `@Global()`, поэтому импортировать его повторно в других модулях не
 * нужно — достаточно один раз зарегистрировать в `App.module.ts`.
 *
 * `I18nModule` уже глобален (зарегистрирован через `forRootAsync`), а
 * `TenancyContext` приходит из `TenancyModule`, который мы импортируем здесь.
 */
@Global()
@Module({
  imports: [TenancyModule],
  providers: [
    OrganizationI18nService,
    // Язык ответа для клиентов, которые просят незнакомый язык или не
    // просят ничего (Р2 карты v21). Именно перехватчик, а не резолвер
    // `nestjs-i18n`: резолверы работают в middleware, до гвардов, и
    // обращение к организации оттуда ломает привязку моделей к её базе —
    // так первая попытка (#322) уронила весь сервер.
    {
      provide: APP_INTERCEPTOR,
      useClass: OrganizationLanguageInterceptor,
    },
  ],
  exports: [OrganizationI18nService],
})
export class OrganizationI18nModule {}
