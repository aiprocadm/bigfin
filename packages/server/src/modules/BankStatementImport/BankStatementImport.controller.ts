// © 2026 Bigfin
import {
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { Import1CStatementService } from './commands/Import1CStatement.service';
import { Import1CResult } from './dtos/Import1CResult.dto';

@Controller('cashflow-accounts')
@ApiTags('Bank Statement Import')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class BankStatementImportController {
  constructor(private readonly import1C: Import1CStatementService) {}

  @Post(':accountId/import/1c')
  @RequirePermission('manage', 'all')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Импортировать банковскую выписку в формате 1С (КлиентБанк).' })
  async import1CFile(
    @Param('accountId') accountId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('accountNumber') accountNumber: string,
    @Body('currencyCode') currencyCode: string,
  ): Promise<Import1CResult> {
    return this.import1C.import(
      Number(accountId),
      accountNumber,
      currencyCode || 'RUB',
      file.buffer,
    );
  }
}
