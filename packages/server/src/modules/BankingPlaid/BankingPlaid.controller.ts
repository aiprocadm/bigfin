import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PlaidApplication } from './PlaidApplication';
import { PlaidItemDto } from './dtos/PlaidItem.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';

@Controller('banking/plaid')
@ApiTags('Banking Plaid')
@UseGuards(AuthorizationGuard, PermissionGuard)
export class BankingPlaidController {
  constructor(private readonly plaidApplication: PlaidApplication) {}

  @Post('link-token')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Get Plaid link token' })
  getLinkToken() {
    return this.plaidApplication.getLinkToken();
  }

  @Post('exchange-token')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Exchange Plaid access token' })
  exchangeToken(@Body() itemDTO: PlaidItemDto) {
    return this.plaidApplication.exchangeToken(itemDTO);
  }
}
