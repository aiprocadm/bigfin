// © 2026 Bigfin
import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { NotificationsApplication } from './Notifications.application';
import { UpdateNotificationPreferencesDto } from './dtos/NotificationPreferences.dto';

@Controller('notifications')
@ApiTags('Notifications')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class NotificationsController {
  constructor(private readonly app: NotificationsApplication) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for this organization.' })
  getPreferences() {
    return this.app.getPreferences();
  }

  @Put('preferences')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Update notification preferences (admin only).' })
  updatePreferences(@Body() dto: UpdateNotificationPreferencesDto) {
    return this.app.updatePreferences(dto);
  }
}
