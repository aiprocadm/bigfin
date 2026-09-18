// © 2026 Bigfin
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { ApiToken } from '@/modules/System/models/ApiToken.model';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

import { issueToken, checkToken, hashToken } from './utils/apiTokens';
import { API_SCOPES, normalizeScopes } from './utils/apiScopes';
import { CreateApiTokenDto } from './dtos/PublicApi.dto';

/** Строка списка токенов. Самого токена здесь нет и быть не может. */
export interface ApiTokenRow {
  id: number;
  name: string;
  /** Хвост: человек узнаёт свой токен, не раскрывая его. */
  lastFour: string;
  scopes: string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date | null;
}

/**
 * Персональные токены публичного API (этап 15 ТЗ).
 *
 * Токен показывается человеку РОВНО ОДИН РАЗ — в ответе на создание. Дальше
 * его нет нигде: ни в базе, ни в журналах, ни в списке. Потерял — выпусти
 * новый и отзови старый.
 *
 * Это неудобно, и это осознанно: «покажите мне мой токен ещё раз» означало бы,
 * что токен лежит в базе целиком, и утечка базы отдавала бы доступ ко всем
 * организациям сразу.
 */
@Injectable()
export class ApiTokensApplication {
  constructor(
    @Inject(ApiToken.name)
    private readonly apiTokenModel: typeof ApiToken,

    private readonly tenancyContext: TenancyContext,
  ) {}

  /** Список токенов организации. */
  public async getApiTokens(): Promise<ApiTokenRow[]> {
    const tenantId = await this.getTenantId();

    const tokens = await this.apiTokenModel
      .query()
      .where('tenantId', tenantId)
      .orderBy('createdAt', 'desc');

    return tokens.map((token) => this.toRow(token));
  }

  /** Какие права вообще бывают — чтобы витрина не выдумывала их сама. */
  public getAvailableScopes() {
    return API_SCOPES;
  }

  /**
   * Выпускает токен.
   *
   * Возвращает сам токен ЕДИНСТВЕННЫЙ раз. В базу уходит только отпечаток.
   */
  public async createApiToken(
    dto: CreateApiTokenDto,
  ): Promise<ApiTokenRow & { token: string }> {
    const tenantId = await this.getTenantId();
    const user = await this.tenancyContext.getSystemUser();

    const issued = issueToken();
    const scopes = normalizeScopes(dto.scopes);

    const created = await this.apiTokenModel.query().insertAndFetch({
      tenantId,
      userId: user?.id ?? null,
      name: dto.name,
      tokenHash: issued.hash,
      lastFour: issued.lastFour,
      scopes: JSON.stringify(scopes),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    } as Partial<ApiToken>);

    return { ...this.toRow(created), token: issued.token };
  }

  /**
   * Отзывает токен.
   *
   * Отзыв, а не удаление: удалённый токен исчезает из журнала вместе с
   * ответом на вопрос «кто и когда им пользовался». Отозванный остаётся
   * видимым и больше не работает.
   */
  public async revokeApiToken(id: number): Promise<ApiTokenRow> {
    const tenantId = await this.getTenantId();

    const token = await this.apiTokenModel
      .query()
      .findOne({ id, tenantId });

    if (!token) {
      throw new NotFoundException('Токен не найден.');
    }
    // Повторный отзыв не сдвигает дату: она отвечает на вопрос «когда
    // перестал работать», и переписывать её нечестно.
    if (token.revokedAt) {
      return this.toRow(token);
    }
    const revoked = await this.apiTokenModel
      .query()
      .patchAndFetchById(id, { revokedAt: new Date() } as Partial<ApiToken>);

    return this.toRow(revoked);
  }

  /**
   * Находит организацию по предъявленному токену — вход публичного API.
   *
   * Поиск идёт ПО ОТПЕЧАТКУ, а не перебором строк: отпечаток уникален и
   * проиндексирован, и обход таблицы на каждый запрос был бы и медленным,
   * и подсказывающим по времени ответа.
   *
   * Отказ наружу всегда один и тот же. Разные ответы («истёк» против
   * «не существует») рассказывают тому, кто перебирает токены, что он
   * угадал строку.
   */
  public async resolveToken(
    presented: string,
    requiredScope?: string,
  ): Promise<{ tenantId: number; tokenId: number } | null> {
    const stored = await this.apiTokenModel
      .query()
      .findOne({ tokenHash: hashToken(presented) });

    if (!stored) return null;

    const rejection = checkToken(
      presented,
      {
        hash: stored.tokenHash,
        revokedAt: stored.revokedAt,
        expiresAt: stored.expiresAt,
        scopes: this.parseScopes(stored.scopes),
      },
      requiredScope,
    );
    if (rejection) return null;

    // Отметка «пользовались» нужна, чтобы перед отзывом старых токенов было
    // видно, какие из них живые. Ошибка отметки не должна ронять запрос.
    await this.apiTokenModel
      .query()
      .patchAndFetchById(stored.id, { lastUsedAt: new Date() } as Partial<ApiToken>)
      .catch(() => undefined);

    return { tenantId: stored.tenantId, tokenId: stored.id };
  }

  private async getTenantId(): Promise<number> {
    const tenant = await this.tenancyContext.getTenant();

    return tenant.id;
  }

  private parseScopes(raw: string | null): string[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);

      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      // Испорченный JSON — это НЕ «прав нет ограничений». Пустой список
      // безопаснее: токен просто перестанет проходить проверку права.
      return [];
    }
  }

  private toRow(token: ApiToken): ApiTokenRow {
    return {
      id: token.id,
      name: token.name,
      lastFour: token.lastFour,
      scopes: this.parseScopes(token.scopes),
      expiresAt: token.expiresAt ?? null,
      revokedAt: token.revokedAt ?? null,
      lastUsedAt: token.lastUsedAt ?? null,
      createdAt: (token as any).createdAt ?? null,
    };
  }
}
