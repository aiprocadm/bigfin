import { Module } from '@nestjs/common';
import { InjectSystemModel } from '../System/SystemModels/SystemModels.module';
import { SystemUser } from '../System/models/SystemUser';
import { TwoFactorController } from './TwoFactor.controller';
import { TwoFactorSetupService } from './commands/TwoFactorSetup.service';
import { TwoFactorEnableService } from './commands/TwoFactorEnable.service';
import { TwoFactorDisableService } from './commands/TwoFactorDisable.service';
import { TwoFactorRegenerateBackupCodesService } from './commands/TwoFactorRegenerateBackupCodes.service';
import { TwoFactorVerifyService } from './commands/TwoFactorVerify.service';
import { GetTwoFactorStateService } from './queries/GetTwoFactorState.service';

const models = [InjectSystemModel(SystemUser)];

@Module({
  controllers: [TwoFactorController],
  providers: [
    ...models,
    TwoFactorSetupService,
    TwoFactorEnableService,
    TwoFactorDisableService,
    TwoFactorRegenerateBackupCodesService,
    TwoFactorVerifyService,
    GetTwoFactorStateService,
  ],
  exports: [TwoFactorVerifyService],
})
export class TwoFactorModule {}
