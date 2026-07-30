import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ServiceError } from '@/modules/Items/ServiceError';
import { mapTinkoffOperation } from './mapTinkoff';
import {
  BankApiOperation,
  BankConnector,
  BankCredentials,
  BankProviderId,
} from '../BankProvider.types';

export const TINKOFF_ERRORS = {
  INVALID_TOKEN: 'TINKOFF_INVALID_TOKEN',
  API_ERROR: 'TINKOFF_API_ERROR',
};

const BASE = 'https://business.tinkoff.ru/openapi';
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Коннектор Тинькофф Бизнес (Statement API). Авторизация — Bearer-токен.
 * Прямой axios (как остальные интеграции сессии).
 */
@Injectable()
export class TinkoffApiService implements BankConnector {
  public readonly id: BankProviderId = 'tinkoff';

  /** Операции за период в канонической форме (контракт `BankConnector`). */
  public async fetchOperations(
    credentials: BankCredentials,
    accountNumber: string,
    from: string,
    to: string,
  ): Promise<BankApiOperation[]> {
    const token = this.assertToken(credentials);
    const operations = await this.getOperations(
      token,
      accountNumber,
      from,
      to,
    );
    return operations.map(mapTinkoffOperation);
  }

  private assertToken(credentials: BankCredentials): string {
    if (!credentials || credentials.kind !== 'token' || !credentials.token) {
      throw new ServiceError(TINKOFF_ERRORS.INVALID_TOKEN);
    }
    return credentials.token;
  }

  /**
   * Операции по счёту за период (`/api/v1/bank-statement`).
   * @param {string} token
   * @param {string} accountNumber
   * @param {string} from — ISO-дата.
   * @param {string} to — ISO-дата.
   */
  public async getOperations(
    token: string,
    accountNumber: string,
    from: string,
    to: string,
  ): Promise<any[]> {
    const url =
      `${BASE}/api/v1/bank-statement` +
      `?accountNumber=${encodeURIComponent(accountNumber)}` +
      `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const data = await this.call(url, token);
    return Array.isArray(data?.operations) ? data.operations : [];
  }

  /** Лёгкая проверка учётных данных (список счетов). */
  public async ping(credentials: BankCredentials): Promise<void> {
    const token = this.assertToken(credentials);
    await this.call(`${BASE}/api/v1/bank-accounts`, token);
  }

  private async call(url: string, token: string): Promise<any> {
    try {
      const res = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        throw new ServiceError(TINKOFF_ERRORS.INVALID_TOKEN);
      }
      throw new ServiceError(TINKOFF_ERRORS.API_ERROR);
    }
  }
}
