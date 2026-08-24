import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OneClickDemo } from '@/modules/System/models/OneClickDemo.model';
import { OrganizationBuildQueue } from '@/modules/Organization/Organization.types';
import { OneClickDemoBuildJobState } from '../OneClickDemo.types';
import {
  OneClickDemoDisabledException,
  OneClickDemoNotFoundException,
} from '../exceptions/OneClickDemo.exceptions';

@Injectable()
export class GetOneClickDemoBuildJobService {
  constructor(
    private readonly configService: ConfigService,

    @Inject(OneClickDemo.name)
    private readonly oneClickDemoModel: typeof OneClickDemo,

    @InjectQueue(OrganizationBuildQueue)
    private readonly organizationBuildQueue: Queue,
  ) {}

  /**
   * Состояние постройки демо-организации. Спрашивают по ключу демо, а не по
   * номеру джоба: номер джоба у BullMQ угадываемый, а ключ демо знает только
   * тот браузер, который демо и создал.
   * @param {string} demoId - Ключ демо.
   * @returns {Promise<OneClickDemoBuildJobState>}
   */
  public async getBuildJobState(
    demoId: string,
  ): Promise<OneClickDemoBuildJobState> {
    if (!this.configService.get('oneClickDemo.enable')) {
      throw new OneClickDemoDisabledException();
    }
    const demo = await this.oneClickDemoModel.query().findOne({ key: demoId });

    if (!demo || !demo.buildJobId) {
      throw new OneClickDemoNotFoundException();
    }
    const job = await this.organizationBuildQueue.getJob(demo.buildJobId);

    if (!job) {
      throw new OneClickDemoNotFoundException();
    }
    const state = await job.getState();

    return {
      id: job.id!,
      state,
      isCompleted: state === 'completed',
      isRunning: state === 'active',
      isWaiting: state === 'waiting' || state === 'waiting-children',
      isFailed: state === 'failed',
    };
  }
}
