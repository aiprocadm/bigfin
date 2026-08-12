import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Inject,
  UseGuards,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { WarehouseTransferApplication } from './WarehouseTransferApplication';
import {
  CreateWarehouseTransferDto,
  EditWarehouseTransferDto,
} from './dtos/WarehouseTransfer.dto';
import { GetWarehouseTransfersQueryDto } from '../Warehouses/dtos/GetWarehouseTransfersQuery.dto';
import { WarehouseTransferResponseDto } from './dtos/WarehouseTransferResponse.dto';
import { PaginatedResponseDto } from '@/common/dtos/PaginatedResults.dto';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { InventoryAdjustmentAction } from '@/modules/InventoryAdjutments/types/InventoryAdjustments.types';

@Controller('warehouse-transfers')
@ApiTags('Warehouse Transfers')
@ApiExtraModels(WarehouseTransferResponseDto, PaginatedResponseDto)
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class WarehouseTransfersController {
  /**
   * @param {WarehouseTransferApplication} warehouseTransferApplication - Warehouse transfer application.
   */
  constructor(
    @Inject(WarehouseTransferApplication)
    private readonly warehouseTransferApplication: WarehouseTransferApplication,
  ) {}

  /**
   * Creates a new warehouse transfer transaction.
   */
  @Post()
  @RequirePermission(
    InventoryAdjustmentAction.CREATE,
    AbilitySubject.InventoryAdjustment,
  )
  @ApiOperation({ summary: 'Create a new warehouse transfer transaction.' })
  @ApiResponse({
    status: 200,
    description:
      'The warehouse transfer transaction has been created successfully.',
  })
  async createWarehouseTransfer(
    @Body() createWarehouseTransferDTO: CreateWarehouseTransferDto,
  ) {
    const warehouse =
      await this.warehouseTransferApplication.createWarehouseTransfer(
        createWarehouseTransferDTO,
      );

    return {
      id: warehouse.id,
      message:
        'The warehouse transfer transaction has been created successfully.',
    };
  }

  /**
   * Edits warehouse transfer transaction.
   */
  @Post(':id')
  @RequirePermission(
    InventoryAdjustmentAction.EDIT,
    AbilitySubject.InventoryAdjustment,
  )
  @ApiOperation({ summary: 'Edit the given warehouse transfer transaction.' })
  @ApiResponse({
    status: 200,
    description:
      'The warehouse transfer transaction has been edited successfully.',
  })
  async editWarehouseTransfer(
    @Param('id', ParseIntPipe) id: number,
    @Body() editWarehouseTransferDTO: EditWarehouseTransferDto,
  ) {
    const warehouseTransfer =
      await this.warehouseTransferApplication.editWarehouseTransfer(
        id,
        editWarehouseTransferDTO,
      );
    return {
      id: warehouseTransfer.id,
      message:
        'The warehouse transfer transaction has been edited successfully.',
    };
  }

  /**
   * Initiates the warehouse transfer.
   */
  @Put(':id/initiate')
  @RequirePermission(
    InventoryAdjustmentAction.EDIT,
    AbilitySubject.InventoryAdjustment,
  )
  @ApiOperation({ summary: 'Initiate the given warehouse transfer.' })
  @ApiResponse({
    status: 200,
    description: 'The warehouse transfer has been initiated successfully.',
  })
  async initiateTransfer(@Param('id', ParseIntPipe) id: number) {
    await this.warehouseTransferApplication.initiateWarehouseTransfer(id);

    return {
      id,
      message: 'The given warehouse transfer has been initialized.',
    };
  }

  /**
   * Marks the given warehouse transfer as transferred.
   */
  @Put(':id/transferred')
  @RequirePermission(
    InventoryAdjustmentAction.EDIT,
    AbilitySubject.InventoryAdjustment,
  )
  @ApiOperation({
    summary: 'Mark the given warehouse transfer as transferred.',
  })
  @ApiResponse({
    status: 200,
    description:
      'The warehouse transfer has been marked as transferred successfully.',
  })
  async deliverTransfer(@Param('id', ParseIntPipe) id: number) {
    await this.warehouseTransferApplication.transferredWarehouseTransfer(id);

    return {
      id,
      message: 'The given warehouse transfer has been delivered.',
    };
  }

  /**
   * Retrieves warehouse transfer transactions with pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'Retrieve warehouse transfer transactions with pagination.',
  })
  @ApiResponse({
    status: 200,
    description:
      'The warehouse transfer transactions have been retrieved successfully.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(PaginatedResponseDto) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(WarehouseTransferResponseDto) },
            },
          },
        },
      ],
    },
  })
  async getWarehousesTransfers(@Query() query: GetWarehouseTransfersQueryDto) {
    const { warehousesTransfers, pagination, filter } =
      await this.warehouseTransferApplication.getWarehousesTransfers(query);

    return {
      data: warehousesTransfers,
      pagination,
      filter,
    };
  }

  /**
   * Retrieves warehouse transfer transaction details.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve warehouse transfer transaction details.' })
  @ApiResponse({
    status: 200,
    description:
      'The warehouse transfer transaction details have been retrieved successfully.',
    schema: {
      $ref: getSchemaPath(WarehouseTransferResponseDto),
    },
  })
  async getWarehouseTransfer(@Param('id', ParseIntPipe) id: number) {
    const warehouseTransfer =
      await this.warehouseTransferApplication.getWarehouseTransfer(id);

    return { data: warehouseTransfer };
  }

  /**
   * Deletes the given warehouse transfer transaction.
   */
  @Delete(':id')
  @RequirePermission(
    InventoryAdjustmentAction.DELETE,
    AbilitySubject.InventoryAdjustment,
  )
  @ApiOperation({ summary: 'Delete the given warehouse transfer transaction.' })
  @ApiResponse({
    status: 200,
    description:
      'The warehouse transfer transaction has been deleted successfully.',
  })
  async deleteWarehouseTransfer(@Param('id', ParseIntPipe) id: number) {
    await this.warehouseTransferApplication.deleteWarehouseTransfer(id);

    return {
      message:
        'The warehouse transfer transaction has been deleted successfully.',
    };
  }
}
