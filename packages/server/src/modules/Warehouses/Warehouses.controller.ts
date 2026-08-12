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
import { WarehousesApplication } from './WarehousesApplication.service';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreateWarehouseDto, EditWarehouseDto } from './dtos/Warehouse.dto';
import { WarehouseResponseDto } from './dtos/WarehouseResponse.dto';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { PreferencesAction } from '@/modules/Settings/Settings.types';

@Controller('warehouses')
@ApiTags('Warehouses')
@ApiExtraModels(WarehouseResponseDto)
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class WarehousesController {
  constructor(private warehousesApplication: WarehousesApplication) {}

  @Post()
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Create a warehouse' })
  createWarehouse(@Body() createWarehouseDTO: CreateWarehouseDto) {
    return this.warehousesApplication.createWarehouse(createWarehouseDTO);
  }

  @Put(':id')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  editWarehouse(
    @Param('id') warehouseId: string,
    @Body() editWarehouseDTO: EditWarehouseDto,
  ) {
    return this.warehousesApplication.editWarehouse(
      Number(warehouseId),
      editWarehouseDTO,
    );
  }

  @Delete(':id')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Delete a warehouse' })
  deleteWarehouse(@Param('id') warehouseId: string) {
    return this.warehousesApplication.deleteWarehouse(Number(warehouseId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a warehouse' })
  @ApiResponse({
    status: 200,
    description: 'The warehouse details have been successfully retrieved.',
    schema: { $ref: getSchemaPath(WarehouseResponseDto) },
  })
  getWarehouse(@Param('id') warehouseId: string) {
    return this.warehousesApplication.getWarehouse(Number(warehouseId));
  }

  @Get()
  @ApiOperation({ summary: 'Get all warehouses' })
  @ApiResponse({
    status: 200,
    description: 'The warehouses have been successfully retrieved.',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(WarehouseResponseDto) },
    },
  })
  getWarehouses() {
    return this.warehousesApplication.getWarehouses();
  }

  @Post('activate')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Activate a warehouse' })
  activateWarehouses() {
    return this.warehousesApplication.activateWarehouses();
  }

  @Put(':id/mark-primary')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Mark a warehouse as primary' })
  markWarehousePrimary(@Param('id') warehouseId: string) {
    return this.warehousesApplication.markWarehousePrimary(Number(warehouseId));
  }
}
