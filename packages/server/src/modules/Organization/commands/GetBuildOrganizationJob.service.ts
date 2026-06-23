import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { OrganizationBuildQueue } from '../Organization.types';
import { ServiceError } from '@/modules/Items/ServiceError';

@Injectable()
export class GetBuildOrganizationBuildJob {
  constructor(
    @InjectQueue(OrganizationBuildQueue)
    private readonly organizationBuildQueue: Queue,
  ) {}

  /**
   * Gets the build job details by job ID.
   * @param {string} jobId - The ID of the job to retrieve.
   * @param {number} [requestUserId] - When provided, only the user who
   *   initiated the build may read it (ownership guard).
   * @returns {Promise<any>} - Returns the job details.
   */
  async getJobDetails(jobId: string, requestUserId?: number): Promise<any> {
    const job = await this.organizationBuildQueue.getJob(jobId);

    if (!job) {
      throw new ServiceError('Job not found', 'JOB.NOT_FOUND');
    }
    // Guard against IDOR: a build job id is a guessable BullMQ id. Only the
    // user who initiated the build may poll it. A foreign job is reported as
    // not-found so we don't reveal that it exists.
    if (
      requestUserId != null &&
      job.data?.userId != null &&
      job.data.userId !== requestUserId
    ) {
      throw new ServiceError('Job not found', 'JOB.NOT_FOUND');
    }
    const state = await job.getState();

    return {
      id: job.id,
      state,
      progress: job.progress,
      isCompleted: state === 'completed',
      isRunning: state === 'active',
      isWaiting: state === 'waiting' || state === 'waiting-children',
      isFailed: state === 'failed',
    };
  }
}
