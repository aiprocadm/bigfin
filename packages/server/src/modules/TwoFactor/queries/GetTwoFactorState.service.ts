import { Inject, Injectable } from '@nestjs/common';
import { SystemUser } from '@/modules/System/models/SystemUser';

export interface TwoFactorState {
  enabled: boolean;
  enabledAt: Date | string | null;
  backupCodesRemaining: number;
}

@Injectable()
export class GetTwoFactorStateService {
  constructor(
    @Inject(SystemUser.name)
    private readonly systemUserModel: typeof SystemUser,
  ) {}

  async getState(userId: number): Promise<TwoFactorState> {
    const user = await this.systemUserModel
      .query()
      .findById(userId)
      .throwIfNotFound();

    const hashes: string[] = JSON.parse(user.twoFactorBackupCodes || '[]');

    return {
      enabled: !!user.twoFactorEnabled,
      enabledAt: user.twoFactorEnabledAt ?? null,
      backupCodesRemaining: user.twoFactorEnabled ? hashes.length : 0,
    };
  }
}
