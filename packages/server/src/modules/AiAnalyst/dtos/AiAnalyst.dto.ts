// © 2026 Bigfin
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** Провайдеры из §13.2 ТЗ. */
export const AI_PROVIDER_KEYS = [
  'yandex_gpt',
  'gigachat',
  'openai_compatible',
  'off',
];

export class EditAiAnalystSettingsDto {
  @ApiPropertyOptional({ enum: AI_PROVIDER_KEYS })
  @IsOptional()
  @IsIn(AI_PROVIDER_KEYS)
  provider?: string;

  @ApiPropertyOptional({
    description:
      'Ключ доступа. Пустое поле НЕ стирает сохранённый ключ: иначе ' +
      'открытие формы и «Сохранить» ломали бы рабочую интеграцию.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  @ApiPropertyOptional({
    description: 'Адрес OpenAI-совместимой модели, в том числе своей.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  endpoint?: string;

  @ApiPropertyOptional({ description: 'Идентификатор каталога для YandexGPT.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  folderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;

  @ApiPropertyOptional({
    description:
      'Не передавать данные во внешние сервисы. При включении раздел ' +
      'недоступен, а не деградирует молча (§13.1 п. 5).',
  })
  @IsOptional()
  @IsBoolean()
  forbidExternalData?: boolean;
}
