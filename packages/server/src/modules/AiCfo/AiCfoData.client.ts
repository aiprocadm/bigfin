// © 2026 Bigfin
import { ForbiddenException, Injectable } from '@nestjs/common';

export interface AiCfoCaller {
  authorization?: string;
  organizationId?: string;
  acceptLanguage?: string;
  /** Режим «глазами сотрудника» (FT-081) — ответ по правам сотрудника. */
  accessPreview?: string;
}

/**
 * Данные для AI CFO — теми же ручками, что у экранов, тем же входом
 * (как у MCP, FT-090).
 *
 * ПОЧЕМУ НЕ СЛУЖБЫ НАПРЯМУЮ. Вызов службы обошёл бы стражей ручек: права
 * человека на отчёт, закрытые разделы. Через ручку AI знает ровно то, что
 * человек увидел бы на экране — с его правами, ограничениями роли по статьям
 * и счетам (FT-080) и тем же кэшем отчётов (FT-093). Только GET.
 */
@Injectable()
export class AiCfoDataClient {
  private get apiBase(): string {
    return (process.env.MCP_API_BASE_URL || `http://127.0.0.1:${process.env.PORT ?? 3000}/api`).replace(/\/+$/, '');
  }

  public async get(path: string, query: Record<string, string | number | undefined>, caller: AiCfoCaller): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
    });
    const url = `${this.apiBase}/${path.replace(/^\/+/, '')}${params.toString() ? `?${params}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        ...(caller.authorization ? { authorization: caller.authorization } : {}),
        ...(caller.organizationId ? { 'organization-id': caller.organizationId } : {}),
        ...(caller.acceptLanguage ? { 'accept-language': caller.acceptLanguage } : {}),
        ...(caller.accessPreview ? { 'x-bigfin-access-preview': caller.accessPreview } : {}),
      },
    });
    const text = await response.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (response.status === 403) {
      // Нет права на нужный отчёт — отвечаем честно, а не «по памяти».
      throw new ForbiddenException({
        errors: [{ type: 'AI_CFO_NO_ACCESS', message: 'Для ответа нужен отчёт, к которому у вас нет доступа.' }],
      });
    }
    if (!response.ok) {
      throw new Error(`Отчёт ${path} ответил ${response.status}`);
    }
    return body;
  }
}
