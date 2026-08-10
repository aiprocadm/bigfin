import { Module } from '@nestjs/common';
import { FeaturesConfigureManager } from './FeaturesConfigureManager';
import { FeaturesManager } from './FeaturesManager';
import { FeaturesSettingsDriver } from './FeaturesSettingsDriver';
import { FeaturesConfigure } from './FeaturesConfigure';
import { FeaturesController } from './Features.controller';
import { FeatureGuard } from './Feature.guard';

@Module({
  controllers: [FeaturesController],
  providers: [
    FeaturesManager,
    FeaturesSettingsDriver,
    FeaturesConfigureManager,
    FeaturesConfigure,
    FeatureGuard,
  ],
  // Страж модулей отдаётся наружу: контроллеры модулей за флагом вешают его
  // на себя одной строкой вместо проверки в каждой ручке.
  exports: [FeaturesManager, FeatureGuard],
})
export class FeaturesModule {}
