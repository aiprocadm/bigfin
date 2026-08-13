// © 2026 Bigfin
import { Ability } from '@casl/ability';
import { allowedContactServices } from './allowedContactServices';

/**
 * Шаг В3 карты v9: подсказка контрагентов отбирает по праву.
 *
 * Пометка «любое из прав» (покупатели ИЛИ поставщики) решает, пустят ли
 * человека к подсказке вовсе, но выдача отдавала обе стороны целиком: роль,
 * которой доверены только поставщики, видела и покупателей с их долгами.
 */
describe('какие стороны контрагентов доверены роли', () => {
  it('только поставщики — только поставщики', () => {
    const ability = new Ability([{ action: 'View', subject: 'Vendor' }]);

    expect(allowedContactServices(ability)).toEqual(['vendor']);
  });

  it('только покупатели — только покупатели', () => {
    const ability = new Ability([{ action: 'View', subject: 'Customer' }]);

    expect(allowedContactServices(ability)).toEqual(['customer']);
  });

  it('оба права — обе стороны', () => {
    const ability = new Ability([
      { action: 'View', subject: 'Customer' },
      { action: 'View', subject: 'Vendor' },
    ]);

    expect(allowedContactServices(ability)).toEqual(['customer', 'vendor']);
  });

  it('владелец с manage all — обе стороны', () => {
    const ability = new Ability([{ action: 'manage', subject: 'all' }]);

    expect(allowedContactServices(ability)).toEqual(['customer', 'vendor']);
  });

  it('без обоих прав — ничего', () => {
    const ability = new Ability([{ action: 'View', subject: 'SaleInvoice' }]);

    expect(allowedContactServices(ability)).toEqual([]);
  });
});
