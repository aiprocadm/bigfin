import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemUser } from '@/modules/System/models/SystemUser';
import { verifyTotpCode } from '../utils/totp';
import { decryptTwoFactorSecret } from '../utils/secretCipher';
import { generateBackupCodes, hashBackupCodes } from '../utils/backupCodes';
import {
  TwoFactorAlreadyEnabledException,
  TwoFactorInvalidCodeException,
  TwoFactorNotConfiguredException,
} from '../exceptions/TwoFactor.exceptions';

@Injectable()
export class TwoFactorEnableService {
  constructor(
    @Inject(SystemUser.name)
    private readonly systemUserModel: typeof SystemUser,

    private readonly configService: ConfigService,
  ) {}

  /**
   * Подтверждает настройку кодом из приложения и включает 2FA.
   * Резервные коды возвращаются открытым текстом ЕДИНСТВЕННЫЙ раз.
   */
  async enable(
    userId: number,
    code: string,
  ): Promise<{ backupCodes: string[] }> {
    const user = await this.systemUserModel
      .query()
      .findById(userId)
      .throwIfNotFound();

    if (user.twoFactorEnabled) {
      throw new TwoFactorAlreadyEnabledException();
    }
    if (!user.twoFactorSecret) {
      throw new TwoFactorNotConfiguredException();
    }
    const appSecret = this.configService.get('jwt.secret');
    const secret = decryptTwoFactorSecret(user.twoFactorSecret, appSecret);

    if (!verifyTotpCode(secret, code)) {
      throw new TwoFactorInvalidCodeException();
    }
    const backupCodes = generateBackupCodes();
    const hashes = await hashBackupCodes(backupCodes);

    await this.systemUserModel.query().findById(userId).patch({
      twoFactorEnabled: true,
      twoFactorEnabledAt: new Date(),
      twoFactorBackupCodes: JSON.stringify(hashes),
    });

    return { backupCodes };
  }
}
