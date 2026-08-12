import { Controller, Get, Query,
  UseGuards,
} from '@nestjs/common';
import { TransactionsByReferenceApplication } from './TransactionsByReferenceApplication';
import { TransactionsByReferenceQueryDto } from './TransactionsByReferenceQuery.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { ReportsAction } from '../../types/Report.types';

@Controller('reports/transactions-by-reference')
@ApiTags('Reports')
@UseGuards(AuthorizationGuard, PermissionGuard)
export class TransactionsByReferenceController {
  constructor(
    private readonly transactionsByReferenceApp: TransactionsByReferenceApplication,
  ) { }

  @Get()
  @RequirePermission(ReportsAction.READ_JOURNAL, AbilitySubject.Report)
  @ApiResponse({ status: 200, description: 'Transactions by reference' })
  @ApiOperation({ summary: 'Get transactions by reference' })
  async getTransactionsByReference(
    @Query() query: TransactionsByReferenceQueryDto,
  ) {
    const data = await this.transactionsByReferenceApp.getTransactions(query);

    return data;
  }
}
