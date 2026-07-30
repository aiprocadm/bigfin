import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthSigninTwoFactorDto {
  @ApiProperty({ description: 'Полу-токен, выданный на шаге пароля' })
  @IsNotEmpty()
  @IsString()
  twoFactorToken: string;

  @ApiProperty({
    example: '123456',
    description: 'Код из приложения-аутентификатора или резервный код',
  })
  @IsNotEmpty()
  @IsString()
  code: string;
}
