import { describe, it, expect } from 'vitest';
import { badgeVariants } from './badge';

describe('badgeVariants', () => {
  it('вариант success даёт зелёный фон', () => {
    expect(badgeVariants({ variant: 'success' })).toContain('bg-success');
  });
  it('существующий destructive не сломан', () => {
    expect(badgeVariants({ variant: 'destructive' })).toContain('bg-danger');
  });
});
