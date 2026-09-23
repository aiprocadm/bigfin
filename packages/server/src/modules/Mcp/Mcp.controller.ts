// © 2026 Bigfin
import { Body, Controller, Get, Headers, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { RequireAnyApiScope } from '@/modules/PublicApi/RequireApiScope.decorator';
import { McpService } from './Mcp.service';

/**
 * Вход MCP-сервера (FT-090 ТЗ-3), транспорт «streamable HTTP»: агент шлёт
 * сообщения JSON-RPC методом POST на `/api/mcp`.
 *
 * Ответ пишется напрямую в `res`, мимо общих перехватчиков: они переводят
 * имена полей в snake_case (`protocolVersion` → `protocol_version`), а
 * протокол MCP читает имена ровно такими, как в спецификации.
 *
 * Ручка сама ничего не меняет — метод POST здесь потому, что так устроен
 * транспорт. Инструменты только читают (см. `utils/mcpTools.ts`).
 */
@ApiTags('MCP')
@Controller('mcp')
export class McpController {
  constructor(private readonly mcp: McpService) {}

  @Post()
  @RequireAnyApiScope()
  @ApiOperation({ summary: 'MCP-сервер для ИИ-агентов: JSON-RPC 2.0, только чтение.' })
  async rpc(
    @Body() body: unknown,
    @Headers('authorization') authorization: string | undefined,
    @Headers('organization-id') organizationId: string | undefined,
    @Headers('accept-language') acceptLanguage: string | undefined,
    @Res() res: Response,
  ) {
    const answer = await this.mcp.handle(body, { authorization, organizationId, acceptLanguage });
    // Одни уведомления — ответа нет, по спецификации транспорта это 202.
    if (answer === undefined) {
      res.status(202).end();
      return;
    }
    res.status(200).json(answer);
  }

  @Get()
  @RequireAnyApiScope()
  @ApiOperation({ summary: 'Поток событий сервером не ведётся: только POST.' })
  stream(@Res() res: Response) {
    // Сервер ничего не присылает сам, поэтому отдельного потока нет (405 —
    // так спецификация велит ответить серверу без потока).
    res.status(405).setHeader('Allow', 'POST').end();
  }
}
