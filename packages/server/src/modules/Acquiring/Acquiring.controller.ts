import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { AcquiringApplication } from './Acquiring.application';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { FeatureGuard } from '@/modules/Features/Feature.guard';
import { RequireFeature } from '@/modules/Features/RequireFeature.decorator';
import { Features } from '@/common/types/Features';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { DateRangeQueryDto } from '@/common/dtos/DateRangeQuery.dto';

class ConnectYookassaDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @IsString()
  @IsNotEmpty()
  secretKey: string;
}

@Controller('acquiring')
@ApiTags('acquiring')
// Право на этих ручках было объявлено, но исполнять его было некому:
// без стража пометка ничего не значит и запрос проходит.
@UseGuards(AuthorizationGuard, PermissionGuard, FeatureGuard)
@RequireFeature(Features.ACQUIRING)
export class AcquiringController {
  constructor(private readonly app: AcquiringApplication) {}

  @Get('status')
  @ApiOperation({ summary: 'Статус подключения эквайринга.' })
  status() {
    return this.app.status();
  }

  @Get('yookassa/summary')
  @ApiOperation({ summary: 'Сводка эквайринга YooKassa за период.' })
  summary(@Query() query: DateRangeQueryDto) {
    return this.app.yookassaSummary(query.from, query.to);
  }

  @Post('yookassa/connect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Подключить YooKassa (shopId + ключ, только админ).' })
  connect(@Body() dto: ConnectYookassaDto) {
    return this.app.connectYookassa(dto.shopId, dto.secretKey);
  }

  @Post('yookassa/disconnect')
  @RequirePermission('manage', 'all')
  @ApiOperation({ summary: 'Отключить YooKassa (только админ).' })
  disconnect() {
    return this.app.disconnectYookassa();
  }
}
