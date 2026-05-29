import { IsOptional } from '@/common/decorators/Validators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsString } from 'class-validator';

export class GetManagementArticlesQueryDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'income', description: 'Filter by kind' })
  kind?: string;

  @IsBooleanString()
  @IsOptional()
  @ApiPropertyOptional({
    example: 'true',
    description: 'Return as nested tree instead of flat list',
  })
  tree?: string;
}
