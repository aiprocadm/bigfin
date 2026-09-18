// © 2026 Bigfin
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';

import { InnConstraint } from '@/modules/RussianLegalAttributes/validators/inn.validator';
import { KppConstraint } from '@/modules/RussianLegalAttributes/validators/kpp.validator';
import { OgrnAnyConstraint } from '@/modules/RussianLegalAttributes/validators/ogrnAny.validator';

/**
 * Юрлицо группы (этап 6 ТЗ, §6.1).
 *
 * Валидаторы ИНН/КПП/ОГРН переиспользуются из `RussianLegalAttributes` —
 * они уже написаны и покрыты 40 тестами. Писать их заново значит завести
 * вторую версию правил, которая рано или поздно разойдётся с первой.
 *
 * Проверяется не только длина, но и контрольная цифра: опечатка в ИНН
 * уезжает в счёт и УПД, где её увидит уже контрагент.
 */
class CommandLegalEntityDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'ООО Ромашка', description: 'Короткое название' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Полное наименование' })
  fullName?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'ООО', description: 'ООО | ИП | АО | НКО | Самозанятый' })
  form: string;

  @IsOptional()
  @IsString()
  @Validate(InnConstraint)
  @ApiPropertyOptional({ example: '7707083893', description: 'ИНН' })
  inn?: string;

  @IsOptional()
  @IsString()
  @Validate(KppConstraint)
  @ApiPropertyOptional({ example: '770701001', description: 'КПП (у ИП нет)' })
  kpp?: string;

  @IsOptional()
  @IsString()
  @Validate(OgrnAnyConstraint)
  @ApiPropertyOptional({ example: '1027700132195', description: 'ОГРН или ОГРНИП' })
  ogrn?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'УСН_Д', description: 'Система налогообложения' })
  taxSystem?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: 'Плательщик НДС' })
  vatPayer?: boolean;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'RUB', description: 'Валюта учёта' })
  baseCurrency?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'ФИО директора' })
  directorName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Юридический адрес' })
  legalAddress?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Фактический адрес' })
  actualAddress?: string;

  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({ description: 'Банковские реквизиты: р/с, банк, БИК, к/с' })
  bankDetails?: Record<string, unknown>;

  // Доля владельца нужна консолидации (этап 7): по ней урезаются показатели
  // юрлица, принадлежащего группе не целиком. Отрицательной или больше 100
  // она быть не может.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  @ApiPropertyOptional({ example: 100, description: 'Доля владельца, %' })
  ownershipShare?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: 'Головное юрлицо группы' })
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: 'Действующее' })
  active?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Порядок в списке' })
  sortOrder?: number;
}

export class CreateLegalEntityDto extends CommandLegalEntityDto {}
export class EditLegalEntityDto extends CommandLegalEntityDto {}
