import { describe, expect, it } from 'vitest';
import { isRowScopeRestricted } from './RowScopeNotice';

/** FT-080 ТЗ-3: плашка видна только роли с ограничением по данным. */
describe('плашка ограничения роли', () => {
  it('показывается по ответу загрузки в любом написании полей', () => {
    expect(isRowScopeRestricted({ row_scope: { restricted: true } })).toBe(true);
    expect(isRowScopeRestricted({ rowScope: { restricted: true } })).toBe(true);
  });

  it('владельцу и роли без ограничений — нет', () => {
    expect(isRowScopeRestricted({ row_scope: { restricted: false } })).toBe(false);
    expect(isRowScopeRestricted({})).toBe(false);
    expect(isRowScopeRestricted(undefined)).toBe(false);
  });
});
