// © 2026 Bigfin
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { DividendsApplication } from './Dividends.application';
import { CreateDividendPayoutDto } from './dtos/DividendPayout.dto';

/**
 * Вывод средств собственнику: сводка «доступно/безопасно/выведено» и
 * регистрация/удаление выплат. Чтение — авторизованный пользователь;
 * мутации — операция владельца (manage all).
 */
@Controller('dividends')
@ApiTags('Dividends')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class DividendsController {
  constructor(private readonly application: DividendsApplication) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Owner payouts summary: net profit, paid out, available and safe amounts.',
  })
  getSummary() {
    return this.application.getSummary();
  }

  @Get('payouts')
  @ApiOperation({ summary: 'List owner payouts (newest first).' })
  getPayouts() {
    return this.application.getPayouts();
  }

  @Post('payouts')
  @RequirePermission('manage', 'all')
  @ApiOperation({
    summary: 'Register an owner payout with GL entries (admin only).',
  })
  createPayout(@Body() dto: CreateDividendPayoutDto) {
    return this.application.createPayout(dto);
  }

  @Delete('payouts/:id')
  @RequirePermission('manage', 'all')
  @ApiOperation({
    summary: 'Delete an owner payout and revert its GL entries (admin only).',
  })
  deletePayout(@Param('id', ParseIntPipe) id: number) {
    return this.application.deletePayout(id);
  }
}
