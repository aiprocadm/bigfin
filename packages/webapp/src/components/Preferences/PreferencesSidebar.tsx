import React from 'react';
import intl from 'react-intl-universal';
import { useHistory, useLocation } from 'react-router-dom';

import { FormattedMessage as T } from '@/components';
import { PreferencesMenu } from '@/constants/preferencesMenu';
import { permissionAllows } from '@/components/Dashboard/permissionAllows';
// Прямой путь, а не сборный '@/components' — как в useCanExport.
import { AbilityContext } from '@/components/Dashboard/DashboardAbilityProvider';
import { cn } from '@/lib/cn';
import PreferencesSidebarContainer from './PreferencesSidebarContainer';

import '@/style/pages/Preferences/Sidebar.scss';

/**
 * Preferences sidebar — сгруппированная навигация настроек в стиле дизайн-системы.
 */
export default function PreferencesSidebar() {
  const history = useHistory();
  const location = useLocation();
  const ability = React.useContext(AbilityContext);

  // Пункт с пометкой права показываем, только если право есть. Вне
  // поставщика прав (тесты) — показываем всё, как useCanExport.
  const itemAllowed = (item: { permission?: Parameters<typeof permissionAllows>[1] }) =>
    !ability || permissionAllows(ability, item.permission);

  return (
    <PreferencesSidebarContainer>
      <div className="preferences-sidebar__head">
        <h2>{<T id={'preferences'} />}</h2>
      </div>

      <nav className="flex flex-col gap-4 p-2" aria-label={intl.get('preferences')}>
        {PreferencesMenu.map((section) => (
          <div key={section.titleId} className="flex flex-col gap-0.5">
            <div className="px-3 pb-1 text-[0.8125rem] font-medium text-text-muted">
              {intl.get(section.titleId)}
            </div>

            {section.items.filter(itemAllowed).map((item) => {
              const Icon = item.icon;
              const active = item.href === location.pathname;
              return (
                <button
                  key={item.href}
                  type="button"
                  disabled={item.disabled}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => history.push(item.href)}
                  className={cn(
                    'relative flex w-full items-center gap-3 rounded-control px-3 py-2 text-left text-sm transition-colors',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    active
                      ? 'bg-surface font-semibold text-text-primary'
                      : 'font-medium text-text-secondary hover:bg-surface hover:text-text-primary',
                  )}
                >
                  {/* Метка текущего раздела — та же, что в главном меню:
                      жёлтая точка слева (§7 ТЗ-4, этап 45). Полоса у края
                      читалась как отдельный цветной элемент (O16 живого
                      прохода), а меню продукта с этапа 45 метит «где я»
                      точкой — «текущий» везде выглядит одинаково. */}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent"
                    />
                  ) : null}
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="truncate">{intl.get(item.labelId)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </PreferencesSidebarContainer>
  );
}
