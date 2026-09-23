import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CreateRoleService } from './commands/CreateRole.service';
import { EditRoleService } from './commands/EditRole.service';
import { DeleteRoleService } from './commands/DeleteRole.service';
import { GetRoleService } from './queries/GetRole.service';
import { GetRolesService } from './queries/GetRoles.service';
import { RegisterTenancyModel } from '../Tenancy/TenancyModels/Tenancy.module';
import { Role } from './models/Role.model';
import { RolePermission } from './models/RolePermission.model';
import { RolesController } from './Roles.controller';
import { RolesApplication } from './Roles.application';
import { RolePermissionsSchema } from './queries/RolePermissionsSchema';
import { AuthorizationGuard } from './Authorization.guard';
import { PermissionGuard } from './Permission.guard';
import { OwnerGuard } from './Owner.guard';
import { RowScopeInterceptor } from './RowScope.interceptor';
import { CreatePreviewSessionService } from './commands/CreatePreviewSession.service';

const models = [
  RegisterTenancyModel(Role),
  RegisterTenancyModel(RolePermission),
];

@Module({
  imports: [...models],
  providers: [
    CreateRoleService,
    EditRoleService,
    DeleteRoleService,
    GetRoleService,
    GetRolesService,
    RolesApplication,
    RolePermissionsSchema,
    CreatePreviewSessionService,
    AuthorizationGuard,
    PermissionGuard,
    OwnerGuard,
    // Ограничение роли по статьям, направлениям и счетам — на каждый
    // запрос, включая ручки без собственных прав (FT-080 ТЗ-3).
    { provide: APP_INTERCEPTOR, useClass: RowScopeInterceptor },
  ],
  controllers: [RolesController],
  exports: [...models, AuthorizationGuard, PermissionGuard, OwnerGuard],
})
export class RolesModule {}
