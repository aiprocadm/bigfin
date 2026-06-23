import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { MoySkladApplication } from './MoySklad.application';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';

class ConnectMoyskladDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

@Controller('moysklad')
@ApiTags('moysklad')
export class MoySkladController {
  constructor(private readonly app: MoySkladApplication) {}

  @Get('status')
  @ApiOperation({ summary: 'Статус подключения МойСклад.' })
  status() {
    return this.app.status();
  }

  @Get('preview')
  @ApiOperation({ summary: 'Превью товаров и продаж из МойСклад (read-only).' })
  preview() {
    return this.app.preview();
  }

  @Post('connect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Подключить МойСклад по токену (только админ).' })
  connect(@Body() dto: ConnectMoyskladDto) {
    return this.app.connect(dto.token);
  }

  @Post('disconnect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Отключить МойСклад (только админ).' })
  disconnect() {
    return this.app.disconnect();
  }
}
