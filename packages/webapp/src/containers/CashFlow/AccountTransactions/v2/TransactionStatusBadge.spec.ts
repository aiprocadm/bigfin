import { describe, it, expect } from 'vitest';
import { getStatusBadgeVariant } from './TransactionStatusBadge';

describe('getStatusBadgeVariant', () => {
  it('categorized → success', () => {
    expect(getStatusBadgeVariant('categorized')).toBe('success');
  });
  it('matched → success', () => {
    expect(getStatusBadgeVariant('matched')).toBe('success');
  });
  it('manual → secondary', () => {
    expect(getStatusBadgeVariant('manual')).toBe('secondary');
  });
  it('неизвестный статус → secondary', () => {
    expect(getStatusBadgeVariant('whatever')).toBe('secondary');
  });
});
