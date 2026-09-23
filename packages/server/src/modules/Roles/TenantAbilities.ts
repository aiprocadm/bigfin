import { createMongoAbility } from '@casl/ability';
import * as LruCache from 'lru-cache';
import { Role } from './models/Role.model';
import { RolePermission } from './models/RolePermission.model';

// store abilities of 1000 most active users
export const ABILITIES_CACHE = new LruCache(1000);

/**
 * Ключ кеша прав — ОРГАНИЗАЦИЯ + пользователь.
 *
 * Раньше ключом был один номер пользователя. Человек бывает владельцем в
 * своей организации и рядовым сотрудником в чужой — права владельца из
 * кеша ушли бы в чужую организацию. Не случалось это лишь потому, что для
 * обычного входа кеш писался под пустым ключом и не срабатывал вовсе
 * (найдено при подключении токенов API, этап 39 ТЗ-3).
 */
export const abilityCacheKey = (organizationId: unknown, userId: unknown) =>
  `${String(organizationId ?? '')}:${String(userId ?? '')}`;

/** Сбросить права пользователя во ВСЕХ организациях. */
export function purgeUserAbilities(userId: unknown) {
  const suffix = `:${String(userId ?? '')}`;
  (ABILITIES_CACHE.keys() as string[]).forEach((key) => {
    if (String(key).endsWith(suffix)) ABILITIES_CACHE.del(key);
  });
}

/**
 * Retrieve ability for the given role.
 * @param {} role
 * @returns
 */
export function getAbilityForRole(role) {
  const rules = getAbilitiesRolesConds(role);
  return createMongoAbility(rules);
}

/**
 * Retrieve abilities of the given role.
 * @param {IRole} role
 * @returns {}
 */
function getAbilitiesRolesConds(role: Role) {
  switch (role.slug) {
    case 'admin': // predefined role.
      return getSuperAdminRules();
    default:
      return getRulesFromRolePermissions(role.permissions || []);
  }
}

/**
 * Retrieve the super admin rules.
 * @returns {}
 */
function getSuperAdminRules() {
  return [{ action: 'manage', subject: 'all' }];
}

/**
 * Retrieve CASL rules from role permissions.
 * @param {RolePermission[]} permissions -
 * @returns {}
 */
function getRulesFromRolePermissions(permissions: RolePermission[]) {
  return permissions
    .filter((permission: RolePermission) => permission.value)
    .map((permission: RolePermission) => {
      return {
        action: permission.ability,
        subject: permission.subject,
      };
    });
}