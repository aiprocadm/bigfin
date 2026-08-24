import { Cron } from '@nestjs/schedule';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CleanupOneClickDemosService } from '../commands/CleanupOneClickDemos.service';

@Injectable()
export class CleanupOneClickDemosJob {
  constructor(
    private readonly cleanupService: CleanupOneClickDemosService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Раз в час убирает демо-организации, которым вышел срок (Д2 карты v18).
   *
   * Проверка флага — внутри задачи, а не при подключении модуля: флаг
   * читается из окружения при каждом запуске, и выключенное демо не должно
   * ничего трогать в базе.
   */
  @Cron('7 * * * *')
  async cleanupExpiredDemosJob() {
    if (!this.configService.get('oneClickDemo.enable')) return;

    try {
      const removed = await this.cleanupService.cleanupExpiredDemos();

      if (removed > 0) {
        console.log(`One-click demo cleanup: removed ${removed} demo(s).`);
      }
    } catch (error) {
      console.error('One-click demo cleanup has failed:', error);
    }
  }
}
