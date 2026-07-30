import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemUser } from '@/modules/System/models/SystemUser';
import { buildOtpAuthUri, generateTotpSecret } from '../utils/totp';
import { encryptTwoFactorSecret } from '../utils/secretCipher';
import { TwoFactorAlreadyEnabledException } from '../exceptions/TwoFactor.exceptions';

@Injectable()
export class TwoFactorSetupService {
  constructor(
    @Inject(SystemUser.name)
    private readonly systemUserModel: typeof SystemUser,

    private readonly configService: ConfigService,
  ) {}

  /**
   * Начинает настройку 2FA: генерирует секрет и сохраняет его зашифрованным.
   * Повторный вызов до включения молча перегенерирует секрет.
   */
  async setup(
    userId: number,
  ): Promise<{ secret: string; otpauthUri: string }> {
    const user = await this.systemUserModel
      .query()
      .findById(userId)
      .throwIfNotFound();

    if (user.twoFactorEnabled) {
      throw new TwoFactorAlreadyEnabledException();
    }
    const secret = generateTotpSecret();
    const appSecret = this.configService.get('jwt.secret');

    await this.systemUserModel.query().findById(userId).patch({
      twoFactorSecret: encryptTwoFactorSecret(secret, appSecret),
    });

    return { secret, otpauthUri: buildOtpAuthUri(secret, user.email) };
  }
}
