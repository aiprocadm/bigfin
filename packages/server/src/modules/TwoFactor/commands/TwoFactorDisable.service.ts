import { Inject, Injectable } from '@nestjs/common';
import { SystemUser } from '@/modules/System/models/SystemUser';
import {
  TwoFactorInvalidPasswordException,
  TwoFactorNotEnabledException,
} from '../exceptions/TwoFactor.exceptions';

@Injectable()
export class TwoFactorDisableService {
  constructor(
    @Inject(SystemUser.name)
    private readonly systemUserModel: typeof SystemUser,
  ) {}

  /**
   * Отключает 2FA. Подтверждение — паролем (не кодом): телефон могли
   * украсть вместе с активной сессией.
   */
  async disable(userId: number, password: string): Promise<void> {
    const user = await this.systemUserModel
      .query()
      .findById(userId)
      .throwIfNotFound();

    if (!user.twoFactorEnabled) {
      throw new TwoFactorNotEnabledException();
    }
    if (!(await user.checkPassword(password))) {
      throw new TwoFactorInvalidPasswordException();
    }
    await this.systemUserModel.query().findById(userId).patch({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
      twoFactorEnabledAt: null,
    });
  }
}
