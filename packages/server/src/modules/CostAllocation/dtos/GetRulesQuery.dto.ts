// © 2026 Bigfin
import { IsBooleanString, IsOptional } from 'class-validator';

export class GetRulesQueryDto {
  @IsBooleanString()
  @IsOptional()
  activeOnly?: string;
}
