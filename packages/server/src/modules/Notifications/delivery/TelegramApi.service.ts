// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ERRORS } from '../constants';

// Базовый адрес API. Переопределяется TELEGRAM_API_BASE — это нужно для
// живой проверки полного цикла против локального двойника Telegram.
const API_BASE = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';

// Защита от зависшего запроса: воркер/HTTP-запрос не должен блокироваться навечно.
const REQUEST_TIMEOUT_MS = 10000;

@Injectable()
export class TelegramApiService {
  private baseFor(token: string) {
    return `${API_BASE}/bot${token}`;
  }

  /**
   * Опрашивает входящие апдейты бота (авто-привязка chat_id и ㉓ быстрый ввод).
   * @param {number} offset — брать апдейты начиная с этого id; Telegram при
   *   этом подтверждает более ранние, и они больше не приходят.
   */
  public async getUpdates(token: string, offset?: number): Promise<any> {
    try {
      const res = await axios.get(`${this.baseFor(token)}/getUpdates`, {
        timeout: REQUEST_TIMEOUT_MS,
        params: offset ? { offset } : undefined,
      });
      return res.data;
    } catch (err: any) {
      throw this.mapError(err);
    }
  }

  /** Отправляет текстовое сообщение в чат. */
  public async sendMessage(
    token: string,
    chatId: string,
    text: string,
  ): Promise<void> {
    try {
      await axios.post(
        `${this.baseFor(token)}/sendMessage`,
        { chat_id: chatId, text },
        { timeout: REQUEST_TIMEOUT_MS },
      );
    } catch (err: any) {
      throw this.mapError(err);
    }
  }

  private mapError(err: any): ServiceError {
    const status = err?.response?.status;
    if (status === 401 || status === 404) {
      return new ServiceError(ERRORS.TELEGRAM_INVALID_TOKEN);
    }
    if (status === 409) {
      return new ServiceError(ERRORS.TELEGRAM_WEBHOOK_SET);
    }
    return new ServiceError(ERRORS.TELEGRAM_API_ERROR);
  }
}
