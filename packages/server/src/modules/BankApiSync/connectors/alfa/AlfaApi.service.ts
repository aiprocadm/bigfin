import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ServiceError } from '@/modules/Items/ServiceError';
import { mapAlfaOperation } from './mapAlfa';
import {
  BankApiOperation,
  BankConnector,
  BankCredentials,
  BankProviderId,
} from '../BankProvider.types';

export const ALFA_ERRORS = {
  INVALID_CREDENTIALS: 'ALFA_INVALID_CREDENTIALS',
  API_ERROR: 'ALFA_API_ERROR',
};

// ⚠️ ВНЕШНИЙ КОНТРАКТ — СВЕРИТЬ с документацией банка при подключении.
// Спецификация Alfa API доступна только зарегистрированным разработчикам,
// поэтому пути и имена параметров заданы по типовому контракту OAuth 2.0 +
// выписки. Правки ожидаются только в этом блоке и в таблице полей mapAlfa.
const TOKEN_URL = 'https://id.alfabank.ru/oidc/token';
const BASE_URL = 'https://api.alfabank.ru/api';
const STATEMENT_PATH = '/statement';
const ACCOUNTS_PATH = '/accounts';

const REQUEST_TIMEOUT_MS = 30000;
// Обновляем токен чуть раньше срока — на разбег часов и сетевые задержки.
const TOKEN_EXPIRY_SKEW_MS = 60_000;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Коннектор Альфа-Банка (⑨c, волна 1). OAuth 2.0: долгоживущий
 * refresh-токен приложения обменивается на короткий access-токен,
 * который кэшируется в памяти процесса до истечения срока.
 */
@Injectable()
export class AlfaApiService implements BankConnector {
  public readonly id: BankProviderId = 'alfa';

  private readonly tokenCache = new Map<string, CachedToken>();

  public async ping(credentials: BankCredentials): Promise<void> {
    const creds = this.assertOauth(credentials);
    const token = await this.getAccessToken(creds);
    await this.get(`${BASE_URL}${ACCOUNTS_PATH}`, token, {});
  }

  public async fetchOperations(
    credentials: BankCredentials,
    accountNumber: string,
    from: string,
    to: string,
  ): Promise<BankApiOperation[]> {
    const creds = this.assertOauth(credentials);
    const token = await this.getAccessToken(creds);

    const data = await this.get(`${BASE_URL}${STATEMENT_PATH}`, token, {
      accountNumber,
      dateFrom: from,
      dateTo: to,
    });
    const operations = Array.isArray(data?.operations) ? data.operations : [];

    return operations.map(mapAlfaOperation);
  }

  private assertOauth(
    credentials: BankCredentials,
  ): Extract<BankCredentials, { kind: 'oauth' }> {
    if (!credentials || credentials.kind !== 'oauth') {
      throw new ServiceError(ALFA_ERRORS.INVALID_CREDENTIALS);
    }
    return credentials;
  }

  private async getAccessToken(
    creds: Extract<BankCredentials, { kind: 'oauth' }>,
  ): Promise<string> {
    const cacheKey = `${creds.clientId}:${creds.refreshToken}`;
    const cached = this.tokenCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) return cached.accessToken;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: creds.refreshToken,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    });

    let data: any;
    try {
      const res = await axios.post(TOKEN_URL, body.toString(), {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      data = res.data;
    } catch (err: any) {
      throw this.toDomainError(err);
    }
    if (!data?.access_token) {
      throw new ServiceError(ALFA_ERRORS.INVALID_CREDENTIALS);
    }
    const ttlMs = Number(data.expires_in ?? 0) * 1000;

    this.tokenCache.set(cacheKey, {
      accessToken: data.access_token,
      expiresAt: Date.now() + Math.max(ttlMs - TOKEN_EXPIRY_SKEW_MS, 0),
    });
    return data.access_token;
  }

  private async get(
    url: string,
    token: string,
    params: Record<string, string>,
  ): Promise<any> {
    try {
      const res = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    } catch (err: any) {
      throw this.toDomainError(err);
    }
  }

  private toDomainError(err: any): ServiceError {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      return new ServiceError(ALFA_ERRORS.INVALID_CREDENTIALS);
    }
    return new ServiceError(ALFA_ERRORS.API_ERROR);
  }
}
