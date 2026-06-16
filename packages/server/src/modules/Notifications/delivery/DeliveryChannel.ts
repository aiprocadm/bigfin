// © 2026 Bigfin
import { Candidate } from '../utils/selectToFire';

export interface DeliveryChannel {
  /** Идентификатор канала: 'email' | 'telegram' | (позже) 'in_app'. */
  readonly key: string;
  /** Настроен ли канал для текущей организации (адрес/токен есть). */
  isConfigured(): Promise<boolean>;
  /** Доставляет уведомление; адрес канал резолвит сам (из настроек/CLS). */
  deliver(candidate: Candidate): Promise<void>;
}
