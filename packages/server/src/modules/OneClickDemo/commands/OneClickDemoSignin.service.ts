import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OneClickDemo } from '@/modules/System/models/OneClickDemo.model';
import { SystemUser } from '@/modules/System/models/SystemUser';
import { TenantModel } from '@/modules/System/models/TenantModel';
import { AuthSigninService } from '@/modules/Auth/commands/AuthSignin.service';
import { AuthSigninResponseDto } from '@/modules/Auth/dtos/AuthSigninResponse.dto';
import {
  OneClickDemoDisabledException,
  OneClickDemoNotFoundException,
} from '../exceptions/OneClickDemo.exceptions';

@Injectable()
export class OneClickDemoSigninService {
  constructor(
    private readonly configService: ConfigService,
    private readonly authSignin: AuthSigninService,

    @Inject(OneClickDemo.name)
    private readonly oneClickDemoModel: typeof OneClickDemo,

    @Inject(SystemUser.name)
    private readonly systemUserModel: typeof SystemUser,

    @Inject(TenantModel.name)
    private readonly tenantModel: typeof TenantModel,
  ) {}

  /**
   * Вход в демо-организацию по ключу демо (пароля пользователь не знает).
   * @param {string} demoId - Ключ демо.
   * @returns {Promise<AuthSigninResponseDto>}
   */
  public async signin(demoId: string): Promise<AuthSigninResponseDto> {
    if (!this.configService.get('oneClickDemo.enable')) {
      throw new OneClickDemoDisabledException();
    }
    const demo = await this.oneClickDemoModel.query().findOne({ key: demoId });

    if (!demo) {
      throw new OneClickDemoNotFoundException();
    }
    const user = await this.systemUserModel.query().findById(demo.userId);
    const tenant = await this.tenantModel.query().findById(demo.tenantId);

    // Демо-записи живут дольше самих организаций (Д2 — уборка старых
    // тенантов): исчезнувшая организация не должна давать 500.
    if (!user || !tenant) {
      throw new OneClickDemoNotFoundException();
    }
    await this.authSignin.recordSuccessfulSignin(user, tenant);

    return {
      accessToken: this.authSignin.signToken(user),
      organizationId: tenant.organizationId,
      tenantId: tenant.id,
      userId: user.id,
    };
  }
}
