// © 2026 Bigfin
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { PreferencesAction } from '@/modules/Settings/Settings.types';

import { LegalEntitiesApplication } from './LegalEntities.application';
import { GetIntercompanyTurnoverService } from './queries/GetIntercompanyTurnover.service';
import { IntercompanyTurnoverQueryDto,
  CreateLegalEntityDto,
  EditLegalEntityDto,
} from './dtos/LegalEntity.dto';

/**
 * Справочник юрлиц (этап 6 ТЗ, §6.4).
 *
 * Ручки записи требуют право на изменение настроек: юрлицо — это
 * настройка организации, а не рядовая запись.
 *
 * Пометка права идёт ВМЕСТЕ со стражем `PermissionGuard`: одна пометка
 * без стража — «мнимая защита», выглядит закрытым, а не проверяется
 * никем. За обоими правилами следят сторожа
 * `Roles/writeEndpointsCoverage.spec.ts` и `Roles/accessGates.spec.ts`.
 */
@ApiTags('Legal Entities')
@Controller('legal-entities')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class LegalEntitiesController {
  constructor(
    private readonly application: LegalEntitiesApplication,
    private readonly intercompany: GetIntercompanyTurnoverService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Список юрлиц со счётчиком закреплённых счетов.' })
  @ApiResponse({
    status: 200,
    description:
      'Список никогда не пуст: при первом обращении создаётся юрлицо ' +
      'по умолчанию из реквизитов организации.',
  })
  getLegalEntities() {
    return this.application.getLegalEntities();
  }

  @Get('intercompany-turnover')
  @ApiOperation({
    summary: 'Внутригрупповые обороты за период: кто кому и сколько.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Нужен для сверки: делает исключение внутренних оборотов из сводных ' +
      'отчётов проверяемым.',
  })
  getIntercompanyTurnover(@Query() query: IntercompanyTurnoverQueryDto) {
    return this.intercompany.getTurnover(query.from, query.to);
  }

  @Post()
  @ApiOperation({ summary: 'Завести юрлицо.' })
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  createLegalEntity(@Body() dto: CreateLegalEntityDto) {
    return this.application.createLegalEntity(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Изменить юрлицо.' })
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  editLegalEntity(@Param('id') id: string, @Body() dto: EditLegalEntityDto) {
    return this.application.editLegalEntity(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить юрлицо.' })
  @ApiResponse({
    status: 200,
    description:
      'Юрлицо с операциями и последнее юрлицо удалить нельзя: разрез ' +
      'по юрлицу остался бы без опоры.',
  })
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  deleteLegalEntity(@Param('id') id: string) {
    return this.application.deleteLegalEntity(Number(id));
  }
}
