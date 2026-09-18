// © 2026 Bigfin
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';

import { AiChatService } from './AiChat.service';

export class AskDto {
  @ApiProperty({ example: 'Сколько мы потратили на рекламу в прошлом квартале?' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  question: string;
}

/**
 * ИИ-чат по финансам (этап 14 ТЗ).
 *
 * Ручка вопроса помечена POST, но НИЧЕГО НЕ МЕНЯЕТ: это чтение, которому
 * нужен текст в теле запроса. Права на запись здесь нет намеренно —
 * спрашивать может каждый, кто и так видит отчёты.
 */
@ApiTags('AI Chat')
@Controller('ai-chat')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class AiChatController {
  constructor(private readonly chat: AiChatService) {}

  @Get('tools')
  @ApiOperation({ summary: 'О чём вообще можно спросить.' })
  getTools() {
    return this.chat.getTools();
  }

  @Post('ask')
  @ApiOperation({ summary: 'Задать вопрос о своих финансах.' })
  @ApiResponse({
    status: 201,
    description:
      'Ответ всегда сопровождается ссылками на отчёты. Числа сверяются ' +
      'с тем, что вернули отчёты; не сошлось — ответ не показывается.',
  })
  ask(@Body() dto: AskDto) {
    return this.chat.ask(dto.question);
  }
}
