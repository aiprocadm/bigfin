// © 2026 Bigfin
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ServiceError } from '@/modules/Items/ServiceError';
import { ERRORS } from '../constants';

const API_BASE = 'https://api.telegram.org';

@Injectable()
export class TelegramApiService {
  private baseFor(token: string) {
    return `${API_BASE}/bot${token}`;
  }

  /** Опрашивает входящие апдейты бота (для авто-привязки chat_id). */
  public async getUpdates(token: string): Promise<any> {
    try {
      const res = await axios.get(`${this.baseFor(token)}/getUpdates`);
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
      await axios.post(`${this.baseFor(token)}/sendMessage`, {
        chat_id: chatId,
        text,
      });
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
