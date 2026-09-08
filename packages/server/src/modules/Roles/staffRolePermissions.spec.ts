// © 2026 Bigfin
import {
  staffRolePermissions,
  STAFF_PERMISSION_SUBJECTS,
} from '@/database/tenant/seeds/core/20210812121909_seed_roles_permissions';
import { getInvalidPermissions } from './utils';
import { AbilitySchema } from './AbilitySchema';
import { MongoAbility, createMongoAbility } from '@casl/ability';

/**
 * Встроенная роль «Сотрудник» обязана действительно давать права.
 *
 * Живая проба показала, что она не давала ничего: приглашённый сотрудник не мог
 * выписать счёт — то единственное, ради чего роль существует. Причин было две,
 * и каждой хватило бы отдельно:
 *
 * 1. права засевались без колонки «включено» — сборка прав отбирает только
 *    включённые и отбрасывала все двадцать четыре;
 * 2. действие писалось строчными («create»), а код спрашивает «Create» —
 *    сверка регистрозависимая.
 *
 * Тест проверяет не текст заготовки, а то, что из неё получается: собирает права
 * ровно так же, как это делает приложение, и спрашивает у них разрешение.
 */

/** Повторяет сборку прав из `TenantAbilities.getRulesFromRolePermissions`. */
const abilityFromSeed = () =>
  createMongoAbility(
    staffRolePermissions()
      .filter((permission) => permission.value)
      .map((permission) => ({
        action: permission.ability,
        subject: permission.subject,
      })),
  );

describe('засеянные права роли «Сотрудник»', () => {
  it('все права включены', () => {
    const disabled = staffRolePermissions().filter(
      (permission) => permission.value !== true,
    );

    expect(disabled).toEqual([]);
  });

  it('каждое право есть в схеме — значит совпадёт с тем, что спрашивает код', () => {
    // Та же проверка, которой приложение отбивает выдуманные права при
    // создании роли через интерфейс. Именно она ловит другой регистр.
    const invalid = getInvalidPermissions(
      AbilitySchema,
      staffRolePermissions() as any,
    );

    expect(invalid).toEqual([]);
  });

  it('сотрудник действительно может вести свои документы', () => {
    const ability = abilityFromSeed();

    STAFF_PERMISSION_SUBJECTS.forEach((subject) => {
      ['Create', 'Edit', 'Delete', 'View'].forEach((action) => {
        expect({ subject, action, can: ability.can(action, subject) }).toEqual({
          subject,
          action,
          can: true,
        });
      });
    });
  });

  it('сотрудник прикладывает и открывает файл, но не удаляет его', () => {
    const ability = abilityFromSeed();

    // Приложить договор к счёту и потом его открыть — повседневная работа.
    // Удаление — тяжелее повседневного, остаётся за владельцем.
    expect(ability.can('Create', 'Attachment')).toBe(true);
    expect(ability.can('View', 'Attachment')).toBe(true);
    expect(ability.can('Delete', 'Attachment')).toBe(false);
  });

  it('сотрудник видит и ведёт справочники, но не удаляет из них', () => {
    const ability = abilityFromSeed();

    // Мягкий вариант (§5 вопрос 10 карты v8): завести контрагента прямо при
    // выписке счёта — повседневная работа. Без просмотра роль была нерабочей
    // вовсе: в списке покупателей и товаров сотруднику отвечали отказом,
    // то есть выбрать, кому и что выставлять, он не мог.
    ['Customer', 'Vendor', 'Item'].forEach((subject) => {
      ['View', 'Create', 'Edit'].forEach((action) => {
        expect({ subject, action, can: ability.can(action, subject) }).toEqual({
          subject,
          action,
          can: true,
        });
      });

      // Удаление — тяжелее повседневного, остаётся администратору.
      expect({ subject, can: ability.can('Delete', subject) }).toEqual({
        subject,
        can: false,
      });
    });
  });

  it('сотрудник видит отчёты по контрагентам, но не общую картину', () => {
    const ability = abilityFromSeed();

    // С кем сколько наработали и кто сколько должен — продолжение работы со
    // счетами и оплатами.
    expect(ability.can('read-customers-transactions', 'Report')).toBe(true);
    expect(ability.can('read-vendors-transactions', 'Report')).toBe(true);
    expect(ability.can('read-customers-summary-balance', 'Report')).toBe(true);
    expect(ability.can('read-vendors-summary-balance', 'Report')).toBe(true);

    // Общая финансовая картина организации — администратору.
    expect(ability.can('read-balance-sheet', 'Report')).toBe(false);
    expect(ability.can('read-profit-loss', 'Report')).toBe(false);
    expect(ability.can('read-trial-balance-sheet', 'Report')).toBe(false);
    expect(ability.can('read-journal', 'Report')).toBe(false);
    expect(ability.can('read-general-ledger', 'Report')).toBe(false);
  });

  it('чужого сотруднику по-прежнему нельзя', () => {
    const ability = abilityFromSeed();

    // Роль даёт повседневную работу с документами — и ничего сверх неё.
    expect(ability.can('Create', 'Account')).toBe(false);
    expect(ability.can('Mutate', 'Preferences')).toBe(false);
    expect(ability.can('TransactionsLocking', 'Account')).toBe(false);
    expect(ability.can('Create', 'ManualJournal')).toBe(false);
  });

  it('состав роли не изменился незаметно', () => {
    // Шесть предметов документов по четыре действия, просмотр и создание
    // вложений, три справочника по три действия (без удаления) и четыре
    // отчёта по контрагентам. Если состав меняют осознанно — меняется и это
    // число.
    expect(staffRolePermissions()).toHaveLength(39);
  });
});
