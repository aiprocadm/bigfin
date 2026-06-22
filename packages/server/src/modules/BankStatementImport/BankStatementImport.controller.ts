// © 2026 Bigfin
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
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
import { FeaturesManager } from '@/modules/Features/FeaturesManager';
import { Features } from '@/common/types/Features';
import { Import1CStatementService } from './commands/Import1CStatement.service';
import { Import1CResult } from './dtos/Import1CResult.dto';

@Controller('cashflow-accounts')
@ApiTags('Bank Statement Import')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class BankStatementImportController {
  constructor(
    private readonly import1C: Import1CStatementService,
    private readonly featuresManager: FeaturesManager,
  ) {}

  @Post(':accountId/import/1c')
  @RequirePermission('manage', 'all')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        file.mimetype === 'text/plain' ||
        file.originalname?.toLowerCase().endsWith('.txt')
          ? cb(null, true)
          : cb(
              new BadRequestException('Поддерживаются только файлы .txt'),
              false,
            ),
    }),
  )
  @ApiOperation({ summary: 'Импортировать банковскую выписку в формате 1С (КлиентБанк).' })
  async import1CFile(
    @Param('accountId') accountId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('accountNumber') accountNumber: string,
    @Body('currencyCode') currencyCode: string,
  ): Promise<Import1CResult> {
    const enabled = await this.featuresManager.accessible(
      Features.BANK_STATEMENT_IMPORT,
    );
    if (!enabled) throw new ForbiddenException('Импорт выписки выключен');

    if (!file) throw new BadRequestException('Файл выписки не передан');

    return this.import1C.import(
      Number(accountId),
      accountNumber,
      currencyCode || 'RUB',
      file.buffer,
    );
  }
}
