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
import {
  ImportTableStatementService,
  TableStatementPreview,
} from './commands/ImportTableStatement.service';
import { Import1CResult } from './dtos/Import1CResult.dto';

const tableUpload = () =>
  FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) =>
      /\.(csv|xlsx|xls)$/i.test(file.originalname ?? '')
        ? cb(null, true)
        : cb(
            new BadRequestException('Поддерживаются файлы .csv, .xlsx, .xls'),
            false,
          ),
  });

@Controller('cashflow-accounts')
@ApiTags('Bank Statement Import')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class BankStatementImportController {
  constructor(
    private readonly import1C: Import1CStatementService,
    private readonly importTable: ImportTableStatementService,
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
      // Имя файла — в историю импорта (FT-043 ТЗ-3).
      file.originalname,
    );
  }
  @Post(':accountId/import/table/preview')
  @RequirePermission('manage', 'all')
  @UseInterceptors(tableUpload())
  @ApiOperation({
    summary: 'Предпросмотр выписки таблицей (CSV/Excel): что распозналось.',
  })
  async previewTable(
    @Param('accountId') accountId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<TableStatementPreview> {
    await this.assertEnabled();
    if (!file) throw new BadRequestException('Файл выписки не передан');

    return this.importTable.preview(
      Number(accountId),
      file.buffer,
      file.originalname,
    );
  }

  @Post(':accountId/import/table')
  @RequirePermission('manage', 'all')
  @UseInterceptors(tableUpload())
  @ApiOperation({ summary: 'Импортировать выписку таблицей (CSV/Excel).' })
  async importTableFile(
    @Param('accountId') accountId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('currencyCode') currencyCode: string,
  ): Promise<Import1CResult> {
    await this.assertEnabled();
    if (!file) throw new BadRequestException('Файл выписки не передан');

    return this.importTable.import(
      Number(accountId),
      currencyCode || 'RUB',
      file.buffer,
      file.originalname,
    );
  }

  private async assertEnabled(): Promise<void> {
    const enabled = await this.featuresManager.accessible(
      Features.BANK_STATEMENT_IMPORT,
    );
    if (!enabled) throw new ForbiddenException('Импорт выписки выключен');
  }
}
