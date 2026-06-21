// © 2026 Bigfin
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsString,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
  Matches,
} from 'class-validator';

export class FinancialOverviewQueryDto {
  @ApiPropertyOptional({ description: 'Начало периода YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Конец периода YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class CreateMarketingChannelDto {
  @ApiProperty({ description: 'Название канала' })
  @IsString()
  name!: string;
}

export class UpdateMarketingChannelDto {
  @ApiPropertyOptional({ description: 'Название канала' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Активен ли канал' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpsertMarketingMonthlyDto {
  @ApiProperty({ description: 'ID канала' })
  @IsInt()
  channelId!: number;

  @ApiProperty({ description: "Месяц 'YYYY-MM'" })
  @Matches(/^\d{4}-\d{2}$/, { message: "month должен быть в формате 'YYYY-MM'" })
  month!: string;

  @ApiProperty({ description: 'Расход на маркетинг за месяц' })
  @IsNumber()
  @Min(0)
  spend!: number;

  @ApiProperty({ description: 'Число новых клиентов за месяц' })
  @IsInt()
  @Min(0)
  newCustomers!: number;
}

export class SetCustomerLifetimeDto {
  @ApiProperty({ description: 'Средний срок жизни клиента в месяцах' })
  @IsNumber()
  @Min(0)
  months!: number;
}
