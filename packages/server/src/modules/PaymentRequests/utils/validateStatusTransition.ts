// © 2026 Bigfin
import { ServiceError } from '@/modules/Items/ServiceError';
import { ERRORS } from '../constants';

const ALLOWED: Record<string, string[]> = {
  // Черновик (FT-053 ТЗ-3) отправляют на согласование или отменяют.
  draft: ['pending', 'cancelled'],
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['cancelled'],
  rejected: [],
  cancelled: [],
};

/**
 * Бросает ServiceError, если переход статуса заявки недопустим.
 * pending → approved/rejected/cancelled; approved → cancelled (отзыв).
 */
export function validateStatusTransition(current: string, next: string): void {
  if (!ALLOWED[current]?.includes(next)) {
    throw new ServiceError(ERRORS.INVALID_STATUS_TRANSITION);
  }
}
