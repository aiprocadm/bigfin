// © 2026 Bigfin
import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { NotificationsApplication } from './Notifications.application';
import { UpdateNotificationPreferencesDto } from './dtos/NotificationPreferences.dto';
import { ConnectTelegramDto } from './dtos/ConnectTelegram.dto';

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

  @Post('telegram/connect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Connect the organization Telegram bot (admin only).' })
  connectTelegram(@Body() dto: ConnectTelegramDto) {
    return this.app.connectTelegram(dto.botToken);
  }

  @Post('telegram/disconnect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Disconnect the organization Telegram bot (admin only).' })
  disconnectTelegram() {
    return this.app.disconnectTelegram();
  }

  @Post('telegram/entries/pull')
  @RequirePermission('manage', 'all')
  @ApiOperation({
    summary: 'Pull new Telegram messages and record them as operations (admin only).',
  })
  pullTelegramEntries() {
    return this.app.pullTelegramEntries();
  }

  @Get('telegram/entry-account')
  @ApiOperation({ summary: 'Account used for operations coming from Telegram.' })
  getTelegramEntryAccount() {
    return this.app.getTelegramEntryAccount();
  }

  @Put('telegram/entry-account')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Set the account for Telegram operations (admin only).' })
  setTelegramEntryAccount(@Body('accountId') accountId: number | null) {
    return this.app.setTelegramEntryAccount(accountId ?? null);
  }

  @Get()
  @ApiOperation({ summary: 'List recent in-app notifications for the current user.' })
  listNotifications() {
    return this.app.listNotifications();
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Count unread notifications for the current user.' })
  unreadCount() {
    return this.app.unreadCount();
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for the current user.' })
  markAllRead() {
    return this.app.markAllNotificationsRead();
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read for the current user.' })
  markRead(@Param('id') id: string) {
    return this.app.markNotificationRead(Number(id));
  }
}
