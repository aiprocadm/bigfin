// © 2026 Bigfin
import { Candidate } from '../utils/selectToFire';

export interface DeliveryChannel {
  readonly key: string; // 'email' | 'in_app' | 'telegram'
  deliver(candidate: Candidate, recipient: string, lang: string): Promise<void>;
}
