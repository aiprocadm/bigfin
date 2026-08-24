import { Knex } from 'knex';
import { Inject, Injectable } from '@nestjs/common';
import { OrganizationI18nService } from '@/modules/OrganizationI18n/OrganizationI18n.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ERRORS } from '../constants';
import {
  IBranchesActivatedPayload,
  IBranchesActivatePayload,
} from '../Branches.types';
import { CreateBranchService } from './CreateBranch.service';
import { BranchesSettingsService } from '../BranchesSettings';
import { ServiceError } from '@/modules/Items/ServiceError';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { Branch } from '../models/Branch.model';
import { events } from '@/common/events/events';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

@Injectable()
export class ActivateBranches {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly eventPublisher: EventEmitter2,
    private readonly createBranch: CreateBranchService,
    private readonly branchesSettings: BranchesSettingsService,
    private readonly orgI18n: OrganizationI18nService,
  ) {}

  /**
   * Throws service error if multi-branches feature is already activated.
   */
  private throwIfMultiBranchesActivated = (isActivated: boolean) => {
    if (isActivated) {
      throw new ServiceError(ERRORS.MUTLI_BRANCHES_ALREADY_ACTIVATED);
    }
  };

  /**
   * Creates a new initial branch.
   */
  private createInitialBranch = async () => {
    // Имя головного подразделения — на языке организации, а не запроса:
    // оно остаётся в справочнике навсегда (Р4 карты v18).
    const name = await this.orgI18n.translate('branches.head_branch');

    return this.createBranch.createBranch({
      name,
      code: '10001',
      primary: true,
    });
  };

  /**
   * Activate multi-branches feature.
   * @returns {Promise<void>}
   */
  public activateBranches = async (): Promise<void> => {
    const isActivated = await this.branchesSettings.isMultiBranchesActive();

    // Throw error if mutli-branches is already activated.
    this.throwIfMultiBranchesActivated(isActivated);

    // Activate multi-branches under unit-of-work environment.
    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Triggers `onBranchActivate` branch.
      await this.eventPublisher.emitAsync(events.branch.onActivate, {
        trx,
      } as IBranchesActivatePayload);

      // Create a new branch as primary branch.
      const primaryBranch = await this.createInitialBranch();

      // Mark the mutli-branches is activated.
      await this.branchesSettings.markMultiBranchesAsActivated();

      // Triggers `onBranchActivated` branch.
      await this.eventPublisher.emitAsync(events.branch.onActivated, {
        primaryBranch,
        trx,
      } as IBranchesActivatedPayload);
    });
  };
}
