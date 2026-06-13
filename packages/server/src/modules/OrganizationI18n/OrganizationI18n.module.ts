import { Global, Module } from '@nestjs/common';
import { TenancyModule } from '../Tenancy/Tenancy.module';
import { OrganizationI18nService } from './OrganizationI18n.service';

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
  providers: [OrganizationI18nService],
  exports: [OrganizationI18nService],
})
export class OrganizationI18nModule {}
