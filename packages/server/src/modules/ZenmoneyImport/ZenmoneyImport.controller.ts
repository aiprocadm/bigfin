import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ZenmoneyImportApplication } from './ZenmoneyImport.application';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';

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
