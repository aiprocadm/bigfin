// © 2026 Bigfin
import { validateStatusTransition } from './validateStatusTransition';

describe('validateStatusTransition', () => {
  it('разрешает pending → approved/rejected/cancelled', () => {
    expect(() => validateStatusTransition('pending', 'approved')).not.toThrow();
    expect(() => validateStatusTransition('pending', 'rejected')).not.toThrow();
    expect(() => validateStatusTransition('pending', 'cancelled')).not.toThrow();
  });

  it('разрешает approved → cancelled (отзыв)', () => {
    expect(() => validateStatusTransition('approved', 'cancelled')).not.toThrow();
  });

  it('запрещает откат и повторные переходы', () => {
    expect(() => validateStatusTransition('approved', 'pending')).toThrow();
    expect(() => validateStatusTransition('approved', 'approved')).toThrow();
    expect(() => validateStatusTransition('rejected', 'approved')).toThrow();
    expect(() => validateStatusTransition('cancelled', 'approved')).toThrow();
  });
});
