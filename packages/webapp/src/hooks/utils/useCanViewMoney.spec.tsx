import * as React from 'react';
import { render } from '@testing-library/react';
import { createMongoAbility } from '@casl/ability';
import { describe, expect, it } from 'vitest';

import { AbilityContext } from '@/components/Dashboard/DashboardAbilityProvider';
import { useCanViewMoney } from './useAbilityContext';

/**
 * FT-084 ТЗ-3: денежные ручки главной закрыты правом «просмотр денежных
 * операций». Витрина обязана узнать об этом ДО запроса — ответ 403 включает
 * общий экран «нет доступа».
 */
function Probe({ out }: { out: { value?: boolean } }) {
  out.value = useCanViewMoney();
  return null;
}

function check(ability: any) {
  const out: { value?: boolean } = {};
  render(
    ability === undefined ? (
      <Probe out={out} />
    ) : (
      <AbilityContext.Provider value={ability}>
        <Probe out={out} />
      </AbilityContext.Provider>
    ),
  );
  return out.value;
}

describe('useCanViewMoney', () => {
  it('есть право «просмотр денежных операций» — можно', () => {
    expect(check(createMongoAbility([{ action: 'View', subject: 'Cashflow' }]))).toBe(true);
  });

  it('права нет (сотрудник со счетами, но без денег) — нельзя', () => {
    expect(check(createMongoAbility([{ action: 'View', subject: 'SaleInvoice' }]))).toBe(false);
  });

  it('вне поставщика прав — можно: там этих запросов не бывает', () => {
    expect(check(undefined)).toBe(true);
  });
});
