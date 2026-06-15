// © 2026 Bigfin
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ToNumber } from '@/common/decorators/Validators';
import { NOTIFICATION_EVENTS } from '../constants';

export class PreferenceItemDto {
  @IsIn(NOTIFICATION_EVENTS as unknown as string[])
  @ApiProperty({ enum: NOTIFICATION_EVENTS })
  eventType: string;

  @IsBoolean()
  @ApiProperty()
  enabled: boolean;

  @IsArray()
  @ApiProperty({ example: ['email'] })
  channels: string[];

  @IsOptional()
  @ApiPropertyOptional({ example: { horizonDays: 7 } })
  threshold?: Record<string, any>;
}

export class UpdateNotificationPreferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  @ApiProperty({ type: [PreferenceItemDto] })
  preferences: PreferenceItemDto[];

  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional({ example: 'owner@org.ru' })
  recipientEmail?: string;

  @IsOptional()
  @ToNumber()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ example: 24 })
  cooldownHours?: number;
}
