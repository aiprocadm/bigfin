import { ApiProperty } from '@nestjs/swagger';

/** Ответ шага пароля, когда у пользователя включена 2FA. */
export class AuthSigninTwoFactorRequiredResponseDto {
  @ApiProperty({ description: 'Требуется второй шаг входа (код 2FA)' })
  requiresTwoFactor: true;

  @ApiProperty({ description: 'Полу-токен для POST /auth/signin/2fa (5 минут)' })
  twoFactorToken: string;
}
