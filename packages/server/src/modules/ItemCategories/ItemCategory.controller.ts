import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ItemCategoryApplication } from './ItemCategory.application';
import { GetItemCategoriesResponse } from './ItemCategory.interfaces';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  CreateItemCategoryDto,
  EditItemCategoryDto,
} from './dtos/ItemCategory.dto';
import { GetItemCategoriesQueryDto } from './dtos/GetItemCategoriesQuery.dto';
import { ItemCategoryResponseDto } from './dtos/ItemCategoryResponse.dto';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { ItemAction } from '@/interfaces/Item';

@Controller('item-categories')
@ApiTags('Item Categories')
@ApiExtraModels(ItemCategoryResponseDto)
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class ItemCategoryController {
  constructor(
    private readonly itemCategoryApplication: ItemCategoryApplication,
  ) {}

  @Post()
  @RequirePermission(ItemAction.CREATE, AbilitySubject.Item)
  @ApiOperation({ summary: 'Create a new item category.' })
  async createItemCategory(@Body() itemCategoryDTO: CreateItemCategoryDto) {
    return this.itemCategoryApplication.createItemCategory(itemCategoryDTO);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieves the item categories.' })
  @ApiResponse({
    status: 200,
    description: 'The item categories have been successfully retrieved.',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(ItemCategoryResponseDto) },
    },
  })
  async getItemCategories(
    @Query() filterDTO: GetItemCategoriesQueryDto,
  ): Promise<GetItemCategoriesResponse> {
    return this.itemCategoryApplication.getItemCategories(filterDTO);
  }

  @Put(':id')
  @RequirePermission(ItemAction.EDIT, AbilitySubject.Item)
  @ApiOperation({ summary: 'Edit the given item category.' })
  async editItemCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() itemCategoryDTO: EditItemCategoryDto,
  ) {
    return this.itemCategoryApplication.editItemCategory(id, itemCategoryDTO);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieves the item category details.' })
  @ApiResponse({
    status: 200,
    description: 'The item category details have been successfully retrieved.',
    schema: { $ref: getSchemaPath(ItemCategoryResponseDto) },
  })
  async getItemCategory(@Param('id', ParseIntPipe) id: number) {
    return this.itemCategoryApplication.getItemCategory(id);
  }

  @Delete(':id')
  @RequirePermission(ItemAction.DELETE, AbilitySubject.Item)
  @ApiOperation({ summary: 'Delete the given item category.' })
  async deleteItemCategory(@Param('id', ParseIntPipe) id: number) {
    return this.itemCategoryApplication.deleteItemCategory(id);
  }
}
