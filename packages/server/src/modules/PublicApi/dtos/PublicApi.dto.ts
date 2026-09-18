// © 2026 Bigfin
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

import { WEBHOOK_EVENTS } from '../utils/webhooks';

export class CreateApiTokenDto {
  @ApiProperty({
    description:
      'Название токена — чтобы через год было понятно, что отзываешь.',
    example: 'Выгрузка в 1С',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description:
      'Права токена. Пустой список — это НЕ «можно всё»: такой токен ' +
      'не пройдёт ни одной проверки права.',
    example: ['reports:read'],
  })
  @IsOptional()
  @IsArray()
  scopes?: string[];

  @ApiPropertyOptional({
    description:
      'Срок жизни. Необязателен: навязанный срок ломал бы интеграции молча.',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class CreateWebhookDto {
  @ApiProperty({
    description: 'Событие, на которое подписываемся.',
    enum: WEBHOOK_EVENTS as unknown as string[],
  })
  @IsIn(WEBHOOK_EVENTS as unknown as string[])
  event: string;

  @ApiProperty({
    description:
      'Адрес получателя. Внутренние адреса запрещены: иначе через вебхук ' +
      'можно заставить наш сервер сходить внутрь нашей же сети.',
    example: 'https://example.com/hooks/bigfin',
  })
  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  url: string;
}

export class EditWebhookDto {
  @ApiPropertyOptional({ enum: WEBHOOK_EVENTS as unknown as string[] })
  @IsOptional()
  @IsIn(WEBHOOK_EVENTS as unknown as string[])
  event?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  url?: string;

  @ApiPropertyOptional({
    description: 'Выключить подписку, не теряя её настройки и историю.',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
