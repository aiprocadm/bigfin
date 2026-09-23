// © 2026 Bigfin
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt } from 'class-validator';

/** Строки, отмеченные в предпросмотре «применить к прошлым» (FT-034). */
export class ApplyBankRuleToPastDto {
  @ApiProperty({ type: [Number], example: [101, 102] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50000)
  @IsInt({ each: true })
  ids: number[];
}
