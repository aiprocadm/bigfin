// © 2026 Bigfin
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConnectTelegramDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '123456:ABC-DEF...' })
  botToken: string;
}
