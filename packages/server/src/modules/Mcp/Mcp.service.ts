// © 2026 Bigfin
import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClsService } from 'nestjs-cls';

import { events } from '@/common/events/events';
import * as moment from 'moment';

import { handleRpcBody, McpHandlers, toolError, toolResult } from './utils/mcpProtocol';
import { McpRateLimiter, MCP_CALLS_PER_MINUTE } from './utils/mcpRateLimit';
import { buildToolRequest, MCP_TOOLS, toolMeta } from './utils/mcpTools';

/** Заголовки запроса агента, которые переносятся в вызов ручки. */
export interface McpCaller {
  authorization?: string;
  organizationId?: string;
  acceptLanguage?: string;
}

/**
 * MCP-сервер Bigfin (FT-090 ТЗ-3): агент читает финансы теми же ручками, что
 * и экран.
 *
 * Каждый инструмент — это ОДИН вызов существующей ручки публичного API тем же
 * токеном. Поэтому права токена, права его владельца, ограничения роли по
 * статьям и счетам и расчёт — те же, что у экрана, и числа совпадают по
 * построению, а не по старанию. Писать инструменты не умеют: только GET.
 */
@Injectable()
export class McpService {
  private readonly limiter = new McpRateLimiter();

  constructor(
    @Optional() private readonly eventEmitter?: EventEmitter2,
    @Optional() private readonly cls?: ClsService,
  ) {}

  /** Куда ходить за данными: этот же сервер. */
  private get apiBase(): string {
    return (
      process.env.MCP_API_BASE_URL ||
      `http://127.0.0.1:${process.env.PORT ?? 3000}/api`
    ).replace(/\/+$/, '');
  }

  public handle(body: unknown, caller: McpCaller) {
    return handleRpcBody(body, this.handlers(caller));
  }

  private handlers(caller: McpCaller): McpHandlers {
    return {
      listTools: () =>
        MCP_TOOLS.map(({ name, title, description, inputSchema }) => ({
          name,
          title,
          description,
          inputSchema,
        })),
      callTool: async (name, args) => {
        const result = await this.callTool(name, args, caller);
        await this.journal(name, !result.isError);
        return result;
      },
    };
  }

  /**
   * Журнал последних вызовов (FT-090, экран «MCP-сервер»): какой инструмент,
   * каким токеном, удачно ли. Сбой записи не мешает агенту получить ответ.
   */
  private async journal(tool: string, ok: boolean) {
    try {
      await this.eventEmitter?.emitAsync(events.mcp.onToolCalled, {
        tool,
        ok,
        apiTokenId: this.cls?.get('apiTokenId') ?? null,
      });
    } catch {
      // Журнал — подсказка владельцу, а не условие ответа.
    }
  }

  private async callTool(name: string, args: Record<string, unknown>, caller: McpCaller) {
    const tool = MCP_TOOLS.find((t) => t.name === name);
    if (!tool) {
      return toolError(
        `Инструмента «${name}» нет. Доступны: ${MCP_TOOLS.map((t) => t.name).join(', ')}.`,
      );
    }
    if (!this.limiter.take(McpRateLimiter.keyOf(caller.authorization))) {
      return toolError(
        `Слишком много вызовов: не больше ${MCP_CALLS_PER_MINUTE} в минуту на токен. Подождите минуту.`,
      );
    }
    const built = buildToolRequest(tool, args);
    if ('error' in built) return toolError(built.error);

    const url = `${this.apiBase}/${built.path}${built.query.toString() ? `?${built.query}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        ...(caller.authorization ? { authorization: caller.authorization } : {}),
        ...(caller.organizationId ? { 'organization-id': caller.organizationId } : {}),
        ...(caller.acceptLanguage ? { 'accept-language': caller.acceptLanguage } : {}),
      },
    });
    const text = await response.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
    if (!response.ok) {
      // Текст отказа — тот же, что у ручки: «У токена нет права «reports:read»»
      // агент перескажет человеку дословно (AC 2).
      const reason =
        payload?.errors?.map((e: any) => e?.message).filter(Boolean).join('; ') ||
        payload?.message ||
        `ответ ${response.status}`;
      return toolError(`Bigfin отказал (${response.status}): ${reason}`);
    }
    return toolResult({
      meta: toolMeta(tool, built, payload, moment().format('YYYY-MM-DD HH:mm:ss')),
      data: payload,
    });
  }
}
