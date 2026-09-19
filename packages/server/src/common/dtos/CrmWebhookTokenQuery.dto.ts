// © 2026 Bigfin
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** Токен входящего вебхука CRM. Без него запрос принимать нельзя. */
export class CrmWebhookTokenQueryDto {
  @IsString()
  @MinLength(1)
  @ApiProperty({ description: 'Токен подписки' })
  token: string;
}
