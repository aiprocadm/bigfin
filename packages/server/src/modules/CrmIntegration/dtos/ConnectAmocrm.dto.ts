import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Подключение amoCRM по поддомену и долгоживущему access-токену. */
export class ConnectAmocrmDto {
  @ApiProperty({
    description: 'Поддомен amoCRM (часть до .amocrm.ru).',
    example: 'mycompany',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/i, {
    message: 'Поддомен должен содержать только буквы, цифры и дефис.',
  })
  subdomain: string;

  @ApiProperty({
    description: 'Долгоживущий access-токен amoCRM.',
    example: 'eyJ0eXAiOiJKV1Qi...',
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
