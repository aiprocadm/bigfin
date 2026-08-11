import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ZenmoneyImportApplication } from './ZenmoneyImport.application';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { FeatureGuard } from '@/modules/Features/Feature.guard';
import { RequireFeature } from '@/modules/Features/RequireFeature.decorator';
import { Features } from '@/common/types/Features';

class ConnectZenmoneyDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

class ImportZenmoneyDto {
  @IsInt()
  accountId: number;

  @IsString()
  @IsOptional()
  currencyCode?: string;
}

@Controller('zenmoney')
@ApiTags('zenmoney')
@UseGuards(FeatureGuard)
@RequireFeature(Features.ZENMONEY_IMPORT)
export class ZenmoneyImportController {
  constructor(private readonly app: ZenmoneyImportApplication) {}

  @Get('status')
  @ApiOperation({ summary: 'Статус подключения Дзенмани.' })
  status() {
    return this.app.status();
  }

  @Post('connect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Подключить Дзенмани по токену (только админ).' })
  connect(@Body() dto: ConnectZenmoneyDto) {
    return this.app.connect(dto.token);
  }

  @Post('disconnect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Отключить Дзенмани (только админ).' })
  disconnect() {
    return this.app.disconnect();
  }

  @Post('import')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Импортировать операции Дзенмани (только админ).' })
  import(@Body() dto: ImportZenmoneyDto) {
    return this.app.importInto(dto.accountId, dto.currencyCode);
  }
}
