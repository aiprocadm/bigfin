import React from 'react';
import intl from 'react-intl-universal';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAccountGroups,
  useCreateAccountGroup,
  useDeleteAccountGroup,
  useEditAccountGroup,
} from '@/hooks/query/accountGroups';

/**
 * Группы денежных счетов (FIN-017 ТЗ-2).
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ ЭКРАН, А НЕ КОЛОНКА НА «СЧЕТАХ». ТЗ предлагало добавить
 * колонку и меню прямо в список счетов, но этот список — легаси-экран с
 * `@ts-nocheck`, а ЧАСТЬ A2 ТЗ запрещает трогать такие файлы в рамках работ
 * по ТЗ. Правило разумное: в файле без проверки типов любая правка рискует
 * сломать то, что не видно. Поэтому управление живёт в настройках — там же,
 * где ТЗ и требует право `Preferences: mutate`, — а пользуются группами в
 * панели денег.
 *
 * УДАЛЕНИЕ СПРАШИВАЕТ, СКОЛЬКО СЧЕТОВ ПЕРЕЕДЕТ. «Удалить группу» человек
 * читает как «удалить», и это самый страшный вопрос, который можно задать
 * рядом с деньгами. «Перенести 4 счёта в Нераспределённые» — это то, что на
 * самом деле произойдёт.
 */
export default function AccountGroupsPage() {
  const { data, isLoading } = useAccountGroups();
  const createGroup = useCreateAccountGroup();
  const editGroup = useEditAccountGroup();
  const deleteGroup = useDeleteAccountGroup();

  const [newName, setNewName] = React.useState('');
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editingName, setEditingName] = React.useState('');

  const groups: any[] = (data as any) ?? [];

  const submitNew = () => {
    const name = newName.trim();
    if (!name) return;
    createGroup.mutate({ name });
    setNewName('');
  };

  const submitEdit = () => {
    const name = editingName.trim();
    if (!name || editingId === null) return;
    editGroup.mutate({ id: editingId, name });
    setEditingId(null);
  };

  const remove = (group: any) => {
    const message = intl.get('account_groups.delete_confirm', {
      count: group.accountsCount ?? 0,
    });
    if (window.confirm(message)) deleteGroup.mutate(group.id);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">
          {intl.get('account_groups.page_title')}
        </h1>
        <p className="mt-1 max-w-[70ch] text-sm text-text-secondary">
          {intl.get('account_groups.page_hint')}
        </p>
      </div>

      <div className="flex max-w-md items-end gap-2">
        <Input
          value={newName}
          maxLength={60}
          placeholder={intl.get('account_groups.name_placeholder')}
          onChange={(event) => setNewName(event.target.value)}
        />
        <Button onClick={submitNew} disabled={!newName.trim()}>
          <Plus className="mr-2 h-4 w-4" />
          {intl.get('account_groups.add')}
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : groups.length === 0 ? (
        <div className="rounded-default border border-border p-6 text-sm text-text-secondary">
          {intl.get('account_groups.empty')}
        </div>
      ) : (
        <ul className="flex max-w-2xl flex-col divide-y divide-border rounded-default border border-border">
          {groups.map((group) => (
            <li
              key={group.id}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              {editingId === group.id ? (
                <span className="flex flex-1 items-center gap-2">
                  <Input
                    value={editingName}
                    maxLength={60}
                    onChange={(event) => setEditingName(event.target.value)}
                  />
                  <Button onClick={submitEdit}>
                    {intl.get('account_groups.save')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setEditingId(null)}
                  >
                    {intl.get('account_groups.cancel')}
                  </Button>
                </span>
              ) : (
                <>
                  <span className="flex flex-col">
                    <span className="font-medium">{group.name}</span>
                    <span className="text-xs text-text-secondary">
                      {intl.get('account_groups.accounts_count', {
                        count: group.accountsCount ?? 0,
                      })}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={intl.get('account_groups.rename')}
                      onClick={() => {
                        setEditingId(group.id);
                        setEditingName(group.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={intl.get('account_groups.delete')}
                      onClick={() => remove(group)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
