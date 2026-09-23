// © 2026 Bigfin
import { RequireAnyPermission } from '@/modules/Roles/RequireAnyPermission.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { PreferencesAction } from '@/modules/Settings/Settings.types';

import { ProjectsApplication } from './Projects.application';
import { CreateProjectDto, EditProjectDto } from './dtos/Project.dto';

/**
 * Справочник направлений (проектов).
 *
 * Направление — разрез операций наравне с подразделением и юрлицом, поэтому
 * его правка требует права на изменение настроек: это настройка организации,
 * а не рядовая запись.
 *
 * Пометка права идёт ВМЕСТЕ со стражем `PermissionGuard`: одна пометка без
 * стража — «мнимая защита», выглядит закрытым, а не проверяется никем.
 */
@ApiTags('Projects')
@Controller('projects')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class ProjectsController {
  constructor(private readonly application: ProjectsApplication) {}

  @RequireAnyPermission({ ability: 'read-managerial-profit-loss', subject: AbilitySubject.Report }, { ability: 'View', subject: AbilitySubject.SaleInvoice })
  @Get()
  @ApiOperation({
    summary: 'Список направлений со счётчиком отнесённых операций.',
  })
  getProjects() {
    return this.application.getProjects();
  }

  @RequireAnyPermission({ ability: 'read-managerial-profit-loss', subject: AbilitySubject.Report }, { ability: 'View', subject: AbilitySubject.SaleInvoice })
  @Get(':id')
  @ApiOperation({ summary: 'Одно направление.' })
  getProject(@Param('id') id: string) {
    return this.application.getProject(Number(id));
  }

  @Post()
  @ApiOperation({ summary: 'Завести направление.' })
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  createProject(@Body() dto: CreateProjectDto) {
    return this.application.createProject(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Изменить направление.' })
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  editProject(@Param('id') id: string, @Body() dto: EditProjectDto) {
    return this.application.editProject(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить направление.' })
  @ApiResponse({
    status: 200,
    description:
      'Направление с операциями удалить нельзя: прошлые операции остались ' +
      'бы со ссылкой в никуда. Такое направление убирают из выбора статусом.',
  })
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  deleteProject(@Param('id') id: string) {
    return this.application.deleteProject(Number(id));
  }
}
