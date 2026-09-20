// © 2026 Bigfin
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Account } from '@/modules/Accounts/models/Account.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

import { AccountGroup } from '../models/AccountGroup.model';

export const ACCOUNT_GROUP_ERRORS = {
  NAME_EXISTS: 'ACCOUNT_GROUP_NAME_EXISTS',
  NAME_REQUIRED: 'ACCOUNT_GROUP_NAME_REQUIRED',
  NOT_FOUND: 'ACCOUNT_GROUP_NOT_FOUND',
};

/** Сколько символов вмещает имя группы. */
export const ACCOUNT_GROUP_NAME_MAX = 60;

/**
 * Пользовательские группы денежных счетов (FIN-017 ТЗ-2).
 *
 * ЗАЧЕМ. При десятке счетов панель денег превращается в простыню. Группы
 * складывают счета в кучки, которыми человек и так мыслит: «операционные»,
 * «депозиты», «личные».
 *
 * УДАЛЕНИЕ ГРУППЫ НИКОГДА НЕ УДАЛЯЕТ СЧЕТА. Человек, убирающий кучку
 * «Депозиты», хочет убрать кучку, а не депозиты. Счета уходят в
 * «Нераспределённые» — это обеспечено и внешним ключом `SET NULL`, и явным
 * обнулением здесь: полагаться на одну лишь базу нельзя, ссылки может не
 * быть на базе, где миграции накатывались частями.
 */
@Injectable()
export class AccountGroupsService {
  constructor(
    @Inject(AccountGroup.name)
    private readonly groupModel: TenantModelProxy<typeof AccountGroup>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  public async getGroups() {
    const groups = await this.groupModel().query().orderBy('sortOrder');
    const accounts: any[] = await this.accountModel().query();

    const countByGroup = new Map<number, number>();
    accounts.forEach((account: any) => {
      const groupId = account.accountGroupId;
      if (groupId == null) return;
      countByGroup.set(groupId, (countByGroup.get(groupId) ?? 0) + 1);
    });

    return (groups as any[]).map((group: any) => ({
      ...(typeof group?.toJSON === 'function' ? group.toJSON() : group),
      // Число счетов нужно и списку, и подтверждению удаления: «перенести
      // 4 счёта» человек понимает, «удалить группу» — нет.
      accountsCount: countByGroup.get(group.id) ?? 0,
    }));
  }

  public async createGroup(name: string, sortOrder = 0) {
    const cleanName = this.validateName(name);
    await this.assertNameFree(cleanName);

    return this.groupModel().query().insertAndFetch({
      name: cleanName,
      sortOrder,
      active: true,
    } as any);
  }

  public async editGroup(id: number, name: string, sortOrder?: number) {
    const cleanName = this.validateName(name);
    await this.assertExists(id);
    await this.assertNameFree(cleanName, id);

    return this.groupModel()
      .query()
      .patchAndFetchById(id, {
        name: cleanName,
        ...(sortOrder === undefined ? {} : { sortOrder }),
      } as any);
  }

  /**
   * Удаляет группу и переносит её счета в «Нераспределённые».
   *
   * Порядок важен: сперва отвязываем счета, потом убираем группу. Обратный
   * порядок оставил бы счета со ссылкой на несуществующую группу на базе,
   * где внешнего ключа нет.
   */
  public async deleteGroup(id: number) {
    await this.assertExists(id);

    const moved = await this.accountModel()
      .query()
      .where('accountGroupId', id)
      .patch({ accountGroupId: null } as any);

    await this.groupModel().query().deleteById(id);

    return { movedAccounts: Number(moved ?? 0) };
  }

  /** Переносит счёт в группу; `null` — в «Нераспределённые». */
  public async assignAccount(accountId: number, groupId: number | null) {
    const account = await this.accountModel().query().findById(accountId);

    if (!account) {
      throw new NotFoundException('ACCOUNT_NOT_FOUND');
    }
    if (groupId !== null) {
      await this.assertExists(groupId);
    }

    // Правка через отбор, а не `findById(...).patch(...)`: тот же приём,
    // что и при удалении группы. Один способ на весь сервис читается легче,
    // чем два одинаковых по смыслу.
    await this.accountModel()
      .query()
      .where('id', accountId)
      .patch({ accountGroupId: groupId } as any);

    return { accountId, groupId };
  }

  private validateName(name: string): string {
    const clean = String(name ?? '').trim();

    if (clean.length === 0 || clean.length > ACCOUNT_GROUP_NAME_MAX) {
      throw new ServiceError(ACCOUNT_GROUP_ERRORS.NAME_REQUIRED);
    }

    return clean;
  }

  private async assertNameFree(name: string, exceptId?: number) {
    const found: any = await this.groupModel()
      .query()
      .findOne('name', name)
      .onBuild((query: any) => {
        if (exceptId) query.whereNot('id', exceptId);
      });

    if (found) {
      throw new ServiceError(ACCOUNT_GROUP_ERRORS.NAME_EXISTS);
    }
  }

  private async assertExists(id: number) {
    const found = await this.groupModel().query().findById(id);

    if (!found) {
      throw new ServiceError(ACCOUNT_GROUP_ERRORS.NOT_FOUND);
    }
  }
}
