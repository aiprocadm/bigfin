import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorEnableDto {
  @ApiProperty({
    example: '123456',
    description: 'Код из приложения-аутентификатора',
  })
  @IsNotEmpty()
  @IsString()
  code: string;
}

export class TwoFactorDisableDto {
  @ApiProperty({ description: 'Пароль аккаунта' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class TwoFactorRegenerateDto {
  @ApiProperty({
    example: '123456',
    description: 'Код из приложения-аутентификатора',
  })
  @IsNotEmpty()
  @IsString()
  code: string;
}

export class TwoFactorStateResponseDto {
  @ApiProperty({ description: 'Включена ли 2FA' })
  enabled: boolean;

  @ApiProperty({ description: 'Когда включена', nullable: true })
  enabledAt: Date | string | null;

  @ApiProperty({ description: 'Сколько резервных кодов не использовано' })
  backupCodesRemaining: number;
}

export class TwoFactorSetupResponseDto {
  @ApiProperty({ description: 'TOTP-секрет (base32) для ручного ввода' })
  secret: string;

  @ApiProperty({ description: 'otpauth://-URI для QR-кода' })
  otpauthUri: string;
}

export class TwoFactorBackupCodesResponseDto {
  @ApiProperty({
    description: 'Резервные коды (показываются один раз)',
    type: [String],
  })
  backupCodes: string[];
}
