// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { NotifyMailFailedService } from './commands/NotifyMailFailed.service';

/**
 * Нарочно отдельный лёгкий модуль: его импортируют пять почтовых модулей
 * (счета, чеки, сметы, оплаты, приглашения), и тащить им весь модуль
 * уведомлений с эвалуаторами и отчётами — значит рисковать циклами импортов.
 * Модель ленты зарегистрирована глобально, поэтому здесь только сервис.
 */
@Module({
  providers: [NotifyMailFailedService],
  exports: [NotifyMailFailedService],
})
export class NotifyMailFailedModule {}
