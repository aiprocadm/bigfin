import React from 'react';
import intl from 'react-intl-universal';
import { useHistory, useLocation } from 'react-router-dom';

import { FormattedMessage as T } from '@/components';
import { PreferencesMenu } from '@/constants/preferencesMenu';
import { cn } from '@/lib/cn';
import PreferencesSidebarContainer from './PreferencesSidebarContainer';

import '@/style/pages/Preferences/Sidebar.scss';

/**
 * Preferences sidebar — сгруппированная навигация настроек в стиле дизайн-системы.
 */
export default function PreferencesSidebar() {
  const history = useHistory();
  const location = useLocation();

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

            {section.items.map((item) => {
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
                      ? 'bg-surface-elevated font-medium text-text-primary'
                      : 'text-text-secondary hover:bg-surface-elevated/60 hover:text-text-primary',
                  )}
                >
                  {active ? (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-action" />
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
