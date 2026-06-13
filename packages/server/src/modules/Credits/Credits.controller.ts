// © 2026 Bigfin
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { CreditsApplication } from './Credits.application';
import { CreateCreditDto, EditCreditDto } from './dtos/Credit.dto';

@Controller('credits')
@ApiTags('Credits')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class CreditsController {
  constructor(private readonly application: CreditsApplication) {}

  @Get('summary')
  @ApiOperation({ summary: 'Credits summary: outstanding debt, next payment.' })
  getSummary() { return this.application.getSummary(); }

  @Get()
  @ApiOperation({ summary: 'List credits with outstanding balance.' })
  getCredits() { return this.application.getCredits(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get a credit with its installment schedule.' })
  getCredit(@Param('id', ParseIntPipe) id: number) {
    return this.application.getCredit(id);
  }

  @Post()
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Create a credit with schedule and GL (admin only).' })
  createCredit(@Body() dto: CreateCreditDto) {
    return this.application.createCredit(dto);
  }

  @Put(':id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Edit credit descriptive fields (admin only).' })
  editCredit(@Param('id', ParseIntPipe) id: number, @Body() dto: EditCreditDto) {
    return this.application.editCredit(id, dto);
  }

  @Delete(':id')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Delete a credit and revert its GL (admin only).' })
  deleteCredit(@Param('id', ParseIntPipe) id: number) {
    return this.application.deleteCredit(id);
  }

  @Post(':id/installments/:installmentId/pay')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Mark an installment paid with GL (admin only).' })
  markPaid(
    @Param('id', ParseIntPipe) id: number,
    @Param('installmentId', ParseIntPipe) installmentId: number,
  ) {
    return this.application.markInstallmentPaid(id, installmentId);
  }
}
