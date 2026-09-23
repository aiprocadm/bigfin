import React from 'react';
import { useAbility } from '@casl/react';
import { permissionAllows } from '@/components/Dashboard/permissionAllows';
import { AbilityContext } from '@/components';
// Прямой путь, а не сборный '@/components': хук главной грузится раньше
// сборного файла, и через него контекст приходит пустым.
import { AbilityContext as DirectAbilityContext } from '@/components/Dashboard/DashboardAbilityProvider';

export const useAbilityContext = () => useAbility(AbilityContext);

/**
 *
 */
export const useAbilitiesFilter = () => {
  const ability = useAbilityContext();

  return React.useCallback(
    (items: any) => {
      // То же правило, что у меню: список прав — «хватит любого из».
      return items.filter((item: any) =>
        permissionAllows(ability, item.permission),
      );
    },
    [ability],
  );
};

/**
 * Можно ли человеку видеть деньги организации (FT-084 ТЗ-3).
 *
 * Сервер закрыл денежные ручки главной правом «просмотр денежных операций».
 * Витрина без этого права их не зовёт: ответ 403 включает общий экран
 * «нет доступа», и сотрудник не увидел бы даже тех разделов, что ему открыты.
 * Вне поставщика прав (экран входа, тесты) — считаем «можно»: там этих
 * запросов не бывает, а ломать их молча хуже.
 */
export const useCanViewMoney = (): boolean => {
  const ability = React.useContext(DirectAbilityContext) as any;
  return !ability || ability.can('View', 'Cashflow');
};
