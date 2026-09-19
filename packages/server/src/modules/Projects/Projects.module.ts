// © 2026 Bigfin
import { Module } from '@nestjs/common';

import { ProjectsApplication } from './Projects.application';
import { ProjectsController } from './Projects.controller';

/**
 * Направления (проекты) — разрез операций.
 *
 * Модуль намеренно маленький: направление это ярлык для раскладки денег, а не
 * управление проектами. Задачами, сроками и работами в Bigfin заняты «Сделки».
 */
@Module({
  controllers: [ProjectsController],
  providers: [ProjectsApplication],
  exports: [ProjectsApplication],
})
export class ProjectsModule {}
