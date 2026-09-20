// © 2026 Bigfin
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
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { AccountAction } from '@/interfaces/Account';

import { AccountGroupsService } from './queries/AccountGroups.service';
import {
  AssignAccountGroupDto,
  CommandAccountGroupDto,
} from './dtos/AccountGroup.dto';

/**
 * Группы денежных счетов (FIN-017 ТЗ-2).
 *
 * Отдельный контроллер, а не ручки внутри счетов: группа — самостоятельный
 * справочник, и смешивать её жизненный цикл с жизненным циклом счёта значит
 * однажды удалить счёт вместе с кучкой.
 */
@Controller('banking/account-groups')
@ApiTags('Bank Accounts')
@UseGuards(AuthorizationGuard, PermissionGuard)
export class AccountGroupsController {
  constructor(private readonly groups: AccountGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Группы счетов с числом счетов в каждой.' })
  getGroups() {
    return this.groups.getGroups();
  }

  @Post()
  @RequirePermission(AccountAction.CREATE, AbilitySubject.Account)
  @ApiOperation({ summary: 'Создать группу счетов.' })
  createGroup(@Body() dto: CommandAccountGroupDto) {
    return this.groups.createGroup(dto.name, dto.sortOrder);
  }

  @Put(':id')
  @RequirePermission(AccountAction.EDIT, AbilitySubject.Account)
  @ApiOperation({ summary: 'Переименовать группу счетов.' })
  editGroup(@Param('id') id: number, @Body() dto: CommandAccountGroupDto) {
    return this.groups.editGroup(Number(id), dto.name, dto.sortOrder);
  }

  @Delete(':id')
  @RequirePermission(AccountAction.DELETE, AbilitySubject.Account)
  @ApiOperation({
    summary: 'Удалить группу. Счета переносятся в «Нераспределённые».',
  })
  deleteGroup(@Param('id') id: number) {
    return this.groups.deleteGroup(Number(id));
  }

  @Put('assign/:accountId')
  @RequirePermission(AccountAction.EDIT, AbilitySubject.Account)
  @ApiOperation({ summary: 'Перенести счёт в группу (или убрать из группы).' })
  assignAccount(
    @Param('accountId') accountId: number,
    @Body() dto: AssignAccountGroupDto,
  ) {
    return this.groups.assignAccount(Number(accountId), dto.groupId ?? null);
  }
}
