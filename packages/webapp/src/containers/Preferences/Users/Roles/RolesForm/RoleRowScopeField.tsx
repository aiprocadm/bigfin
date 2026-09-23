// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useField } from 'formik';

import { useManagementArticles } from '@/hooks/query/managementArticles';
import { useCashflowAccounts } from '@/hooks/query/cashflowAccounts';
import { useDirections } from '@/hooks/query/projects';

type Option = { id: number; name: string };

/**
 * Ограничения роли по строкам (FT-080 ТЗ-3): статьи, направления, счета.
 *
 * Нанятому финансисту направления «Розница» не нужно видеть деньги «Опта».
 * Сервер исключает чужие строки из каждого отчёта, реестра, календаря и
 * выгрузки, а итог считает по тому, что осталось.
 *
 * НИЧЕГО НЕ ОТМЕЧЕНО — БЕЗ ОГРАНИЧЕНИЯ, как у юрлиц рядом: владельцу и
 * обычным ролям ничего настраивать не нужно.
 */
export function RoleRowScopeField() {
  const { data: articles } = useManagementArticles() as { data?: Option[] };
  const { data: directions } = useDirections() as { data?: Option[] };
  const { data: accounts } = useCashflowAccounts() as { data?: Option[] };

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-text-primary">
          {intl.get('roles.row_scope.title')}
        </h3>
        <p className="text-xs text-text-muted">
          {intl.get('roles.row_scope.hint')}
        </p>
      </div>
      <ScopeChecklist
        name="allowed_project_ids"
        title={intl.get('roles.row_scope.projects')}
        options={directions}
      />
      <ScopeChecklist
        name="allowed_account_ids"
        title={intl.get('roles.row_scope.accounts')}
        options={accounts}
      />
      <ScopeChecklist
        name="allowed_article_ids"
        title={intl.get('roles.row_scope.articles')}
        options={articles}
      />
    </section>
  );
}

function ScopeChecklist({
  name,
  title,
  options,
}: {
  name: string;
  title: string;
  options?: Option[];
}) {
  const [field, , helpers] = useField(name);
  // Выбирать не из чего — блока нет: пустой список галочек только путает.
  if (!options || options.length === 0) return null;

  const selected: Array<number | string> = Array.isArray(field.value)
    ? field.value
    : [];
  const isChecked = (id: number) =>
    selected.some((value) => String(value) === String(id));
  const toggle = (id: number) =>
    helpers.setValue(
      isChecked(id)
        ? selected.filter((value) => String(value) !== String(id))
        : [...selected, id],
    );

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-xs font-medium text-text-secondary">
        {title}
        {selected.length > 0 &&
          ` · ${intl.get('roles.row_scope.selected', { count: selected.length })}`}
      </legend>
      <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
        {options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={isChecked(option.id)}
              onChange={() => toggle(option.id)}
            />
            <span className="min-w-0 break-words">{option.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
