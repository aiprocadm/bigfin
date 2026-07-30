import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemUser } from '@/modules/System/models/SystemUser';
import { verifyTotpCode } from '../utils/totp';
import { decryptTwoFactorSecret } from '../utils/secretCipher';
import { consumeBackupCode } from '../utils/backupCodes';

@Injectable()
export class TwoFactorVerifyService {
  constructor(
    @Inject(SystemUser.name)
    private readonly systemUserModel: typeof SystemUser,

    private readonly configService: ConfigService,
  ) {}

  /**
   * Проверяет второй фактор на входе: TOTP-код или резервный код.
   * Резервный код после успешной проверки сгорает.
   * Только проверка — исключений не бросает.
   */
  async verify(user: SystemUser, code: string): Promise<boolean> {
    if (!user.twoFactorEnabled || !user.twoFactorSecret) return false;

    const appSecret = this.configService.get('jwt.secret');
    const secret = decryptTwoFactorSecret(user.twoFactorSecret, appSecret);

    if (verifyTotpCode(secret, code)) return true;

    const hashes: string[] = JSON.parse(user.twoFactorBackupCodes || '[]');
    const rest = await consumeBackupCode(hashes, code);

    if (rest === null) return false;

    await this.systemUserModel.query().findById(user.id).patch({
      twoFactorBackupCodes: JSON.stringify(rest),
    });
    return true;
  }
}
