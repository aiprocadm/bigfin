// © 2026 Bigfin
import { MongoAbility } from '@casl/ability';

/**
 * Какие стороны контрагентов доверены роли: покупатели, поставщики или обе.
 *
 * Контрагент — это покупатель ИЛИ поставщик, и пометка «любое из прав» на
 * ручке решает только, пустить ли человека вовсе. Выдачу же надо сузить до
 * доверенной стороны: роль «только поставщики» не должна видеть покупателей
 * с их долгами (шаг В3 карты v9).
 */
export const allowedContactServices = (ability: MongoAbility): string[] => {
  const services: string[] = [];

  if (ability.can('View', 'Customer')) services.push('customer');
  if (ability.can('View', 'Vendor')) services.push('vendor');

  return services;
};
