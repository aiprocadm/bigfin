// © 2026 Bigfin
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FeaturesManager } from './FeaturesManager';
import { MODULE_ALLOWLIST } from './Features.constants';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { PreferencesAction } from '@/modules/Settings/Settings.types';

@Controller('features')
@ApiTags('features')
@UseGuards(AuthorizationGuard, PermissionGuard)
export class FeaturesController {
  constructor(private readonly featuresManager: FeaturesManager) {}

  @Get()
  @ApiOperation({ summary: 'Retrieves all features and their accessibility.' })
  async all() {
    return this.featuresManager.all();
  }

  @Post(':feature/turn-on')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Turns on the given module feature.' })
  async turnOn(@Param('feature') feature: string) {
    this.assertAllowed(feature);
    await this.featuresManager.turnOn(feature);
    return { feature, accessible: true };
  }

  @Post(':feature/turn-off')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Turns off the given module feature.' })
  async turnOff(@Param('feature') feature: string) {
    this.assertAllowed(feature);
    await this.featuresManager.turnOff(feature);
    return { feature, accessible: false };
  }

  private assertAllowed(feature: string) {
    if (!MODULE_ALLOWLIST.includes(feature)) {
      throw new BadRequestException(
        `Feature "${feature}" is not a toggleable module.`,
      );
    }
  }
}
