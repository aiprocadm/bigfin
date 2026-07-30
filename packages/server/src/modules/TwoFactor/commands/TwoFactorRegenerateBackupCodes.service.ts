import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemUser } from '@/modules/System/models/SystemUser';
import { verifyTotpCode } from '../utils/totp';
import { decryptTwoFactorSecret } from '../utils/secretCipher';
import { generateBackupCodes, hashBackupCodes } from '../utils/backupCodes';
import {
  TwoFactorInvalidCodeException,
  TwoFactorNotEnabledException,
} from '../exceptions/TwoFactor.exceptions';

@Injectable()
export class TwoFactorRegenerateBackupCodesService {
  constructor(
    @Inject(SystemUser.name)
    private readonly systemUserModel: typeof SystemUser,

    private readonly configService: ConfigService,
  ) {}

  /** Выдаёт свежие 10 резервных кодов взамен всех старых. */
  async regenerate(
    userId: number,
    code: string,
  ): Promise<{ backupCodes: string[] }> {
    const user = await this.systemUserModel
      .query()
      .findById(userId)
      .throwIfNotFound();

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new TwoFactorNotEnabledException();
    }
    const appSecret = this.configService.get('jwt.secret');
    const secret = decryptTwoFactorSecret(user.twoFactorSecret, appSecret);

    if (!verifyTotpCode(secret, code)) {
      throw new TwoFactorInvalidCodeException();
    }
    const backupCodes = generateBackupCodes();
    const hashes = await hashBackupCodes(backupCodes);

    await this.systemUserModel.query().findById(userId).patch({
      twoFactorBackupCodes: JSON.stringify(hashes),
    });

    return { backupCodes };
  }
}
