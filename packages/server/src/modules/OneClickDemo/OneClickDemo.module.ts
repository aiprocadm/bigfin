import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrganizationBuildQueue } from '../Organization/Organization.types';
import { AuthModule } from '../Auth/Auth.module';
import { OneClickDemoController } from './OneClickDemo.controller';
import { CreateOneClickDemoService } from './commands/CreateOneClickDemo.service';
import { OneClickDemoSigninService } from './commands/OneClickDemoSignin.service';
import { GetOneClickDemoBuildJobService } from './queries/GetOneClickDemoBuildJob.service';

/**
 * Демо-режим «в один щелчок» (Д1 карты v18, решение 21).
 * Очередь постройки — та же, что у обычной организации: демо строится тем
 * же джобом, никакого второго пути постройки не появляется.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: OrganizationBuildQueue }),
    AuthModule,
  ],
  providers: [
    CreateOneClickDemoService,
    OneClickDemoSigninService,
    GetOneClickDemoBuildJobService,
  ],
  controllers: [OneClickDemoController],
})
export class OneClickDemoModule {}
