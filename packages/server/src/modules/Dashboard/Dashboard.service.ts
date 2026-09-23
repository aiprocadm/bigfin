import { currentAccessPreview } from '@/modules/Roles/utils/accessPreview';
import { currentRowScope, describeRowScope } from '@/modules/Roles/utils/rowScope';
import { Inject } from '@nestjs/common';
import { TenantModelProxy } from '../System/models/TenantBaseModel';
import { FeaturesManager } from '../Features/FeaturesManager';
import { ConfigService } from '@nestjs/config';
import { TenancyContext } from '../Tenancy/TenancyContext.service';
import { IFeatureAllItem } from '@/common/types/Features';
import { TenantUser } from '../Tenancy/TenancyModels/models/TenantUser.model';

interface IRoleAbility {
  subject: string;
  action: string;
}

interface IDashboardBootMeta {
  abilities: IRoleAbility[];
  features: IFeatureAllItem[];
  isBigfinCloud: boolean;
  /** Ограничение роли по строкам — для плашки «показаны только доступные вам» (FT-080). */
  rowScope: ReturnType<typeof describeRowScope>;
  /** Режим проверки доступа: чьими глазами смотрит владелец (FT-081). */
  accessPreview: { userId: number; name: string } | null;
}

export class DashboardService {
  constructor(
    private readonly featuresManager: FeaturesManager,
    private readonly configService: ConfigService,
    private readonly tenancyContext: TenancyContext,

    @Inject(TenantUser.name)
    private readonly tenantUserModel: TenantModelProxy<typeof TenantUser>,
  ) {}

  /**
   * Retrieve dashboard meta.
   */
  public getBootMeta = async (): Promise<IDashboardBootMeta> => {
    // Retrieves all orgnaization abilities.
    const abilities = await this.getBootAbilities();

    // Retrieves all organization features.
    const features = await this.featuresManager.all();

    return {
      abilities,
      features,
      isBigfinCloud: this.configService.get('cloud.hostedOnCloud'),
      rowScope: describeRowScope(currentRowScope()),
      accessPreview: this.describeAccessPreview(),
    };
  };

  private describeAccessPreview() {
    const preview = currentAccessPreview();
    return preview ? { userId: preview.tenantUserId, name: preview.name } : null;
  }

  /**
   * Transformes role permissions to abilities.
   */
  transformRoleAbility = (permissions) => {
    return permissions
      .filter((permission) => permission.value)
      .map((permission) => ({
        subject: permission.subject,
        action: permission.ability,
      }));
  };

  /**
   * Retrieve the boot abilities.
   * @returns {Promise<IRoleAbility[]>}
   */
  private getBootAbilities = async (): Promise<IRoleAbility[]> => {
    const authorizedUser = await this.tenancyContext.getSystemUser();
    // В режиме проверки доступа витрина строится по правам сотрудника.
    const userId = currentAccessPreview()?.systemUserId ?? authorizedUser.id;

    const tenantUser = await this.tenantUserModel()
      .query()
      .findOne('systemUserId', userId)
      .withGraphFetched('role.permissions')
      .throwIfNotFound();

    return tenantUser.role.slug === 'admin'
      ? [{ subject: 'all', action: 'manage' }]
      : this.transformRoleAbility(tenantUser.role.permissions);
  };
}
