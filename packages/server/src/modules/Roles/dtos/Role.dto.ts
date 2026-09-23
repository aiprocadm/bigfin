import { IsOptional } from '@/common/decorators/Validators';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsString,
  Length,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CommandRolePermissionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'subject',
    description: 'The subject of the permission',
  })
  subject: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'read',
    description: 'The action of the permission',
  })
  ability: string;

  @IsBoolean()
  @IsNotEmpty()
  @ApiProperty({
    example: true,
    description: 'The value of the permission',
  })
  value: boolean;
}

export class CreateRolePermissionDto extends CommandRolePermissionDto { }
export class EditRolePermissionDto extends CommandRolePermissionDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({
    example: 1,
    description: 'The permission ID',
  })
  permissionId: number;
}

class CommandRoleDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'admin',
    description: 'The name of the role',
  })
  roleName: string;

  @IsString()
  @ApiProperty({
    example: 'Administrator',
    description: 'The description of the role',
  })
  roleDescription: string;

  /**
   * Юрлица, к которым допущена роль (этап 8 ТЗ, §8.4, остаток К6).
   *
   * ПУСТО ЗНАЧИТ «ВСЕ». Это не мелочь оформления: для ограниченной роли «все
   * юрлица» означает «все ЕЁ юрлица», а не все вообще. Список заполняется
   * только там, где доступ и правда сужают.
   */
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  @ApiProperty({
    required: false,
    example: [1, 2],
    description: 'Юрлица, к которым допущена роль. Пусто — ко всем.',
  })
  allowedLegalEntityIds?: number[];

  /** Статьи роли (FT-080 ТЗ-3). Пусто — без ограничения. */
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  @ApiProperty({
    required: false,
    example: [1, 2],
    description: 'Статьи, к которым допущена роль. Пусто — ко всем.',
  })
  allowedArticleIds?: number[];

  /** Направления роли (FT-080 ТЗ-3). Пусто — без ограничения. */
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  @ApiProperty({
    required: false,
    example: [1, 2],
    description: 'Направления, к которым допущена роль. Пусто — ко всем.',
  })
  allowedProjectIds?: number[];

  /** Денежные счета роли (FT-080 ТЗ-3). Пусто — без ограничения. */
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  @ApiProperty({
    required: false,
    example: [1, 2],
    description: 'Денежные счета, к которым допущена роль. Пусто — ко всем.',
  })
  allowedAccountIds?: number[];
}

export class CreateRoleDto extends CommandRoleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRolePermissionDto)
  @ApiProperty({
    type: [CreateRolePermissionDto],
    description: 'The permissions of the role',
  })
  permissions: Array<CreateRolePermissionDto>;
}

export class EditRoleDto extends CommandRoleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EditRolePermissionDto)
  @ApiProperty({
    type: [EditRolePermissionDto],
    description: 'The permissions of the role',
  })
  permissions: Array<EditRolePermissionDto>;
}
