// © 2026 Bigfin
import { IsOptional, ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsNumber, IsString, Min } from 'class-validator';

export class CreateFixedAssetDto {
  @IsString()
  @ApiProperty({ example: 'Станок ЧПУ' })
  name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Оборудование' })
  category?: string;

  @ToNumber()
  @IsNumber()
  @Min(0.01)
  @ApiProperty({ example: 600000 })
  cost: number;

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 0, description: 'Ликвидационная стоимость' })
  salvageValue?: number;

  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 60, description: 'Срок полезного использования, мес.' })
  serviceLifeMonths: number;

  @IsDateString()
  @ApiProperty({ example: '2026-03-15', description: 'Дата ввода в эксплуатацию' })
  commissionedAt: string;

  @ToNumber()
  @IsInt()
  @ApiProperty({ example: 12, description: 'Счёт-актив (тип fixed-asset)' })
  assetAccountId: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Инв. №42' })
  note?: string;
}

export class AccrueMonthDto {
  @IsString()
  @ApiProperty({ example: '2026-04', description: 'Месяц начисления YYYY-MM' })
  period: string;
}

export class DisposeFixedAssetDto {
  @IsDateString()
  @ApiProperty({ example: '2026-12-31', description: 'Дата выбытия' })
  disposedAt: string;

  @IsIn(['sale', 'liquidation'])
  @ApiProperty({ example: 'sale', enum: ['sale', 'liquidation'] })
  disposalType: 'sale' | 'liquidation';

  @ToNumber()
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 350000, description: 'Сумма продажи (0 при ликвидации)' })
  proceeds?: number;

  @ToNumber()
  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ example: 1, description: 'Счёт зачисления денег при продаже' })
  paymentAccountId?: number;
}
