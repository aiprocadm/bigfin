import { Module } from '@nestjs/common';
import { FeaturesConfigureManager } from './FeaturesConfigureManager';
import { FeaturesManager } from './FeaturesManager';
import { FeaturesSettingsDriver } from './FeaturesSettingsDriver';
import { FeaturesConfigure } from './FeaturesConfigure';
import { FeaturesController } from './Features.controller';

@Module({
  controllers: [FeaturesController],
  providers: [
    FeaturesManager,
    FeaturesSettingsDriver,
    FeaturesConfigureManager,
    FeaturesConfigure
  ],
  exports: [FeaturesManager],
})
export class FeaturesModule {}
