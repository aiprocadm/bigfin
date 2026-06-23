import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Подключение Битрикс24 по входящему webhook-URL. */
export class ConnectBitrix24Dto {
  @ApiProperty({
    description: 'Входящий webhook-URL Битрикс24 (содержит токен).',
    example: 'https://example.bitrix24.ru/rest/1/abcdef0123456789/',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^https:\/\/.+\/rest\/.+/, {
    message: 'Ожидается входящий webhook-URL Битрикс24 (.../rest/...).',
  })
  webhookUrl: string;
}
