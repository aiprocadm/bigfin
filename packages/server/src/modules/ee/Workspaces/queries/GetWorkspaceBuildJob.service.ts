import { Injectable } from '@nestjs/common';
import { GetBuildOrganizationBuildJob } from '@/modules/Organization/commands/GetBuildOrganizationJob.service';

@Injectable()
export class GetWorkspaceBuildJobService {
  constructor(
    private readonly getBuildJobService: GetBuildOrganizationBuildJob,
  ) {}

  /**
   * Returns the current status of a workspace build job.
   * @param {string} buildJobId
   * @param {number} [requestUserId] - Ownership guard: only the initiator polls.
   */
  getJobDetails(buildJobId: string, requestUserId?: number) {
    return this.getBuildJobService.getJobDetails(buildJobId, requestUserId);
  }
}
