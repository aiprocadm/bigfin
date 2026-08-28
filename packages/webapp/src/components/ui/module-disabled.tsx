import React from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { PowerOff } from 'lucide-react';

import { Button } from './button';
import { EmptyState } from './empty-state';

/** Где включают модули. */
const MODULES_SETTINGS_PATH = '/preferences/modules';

/**
 * П1 карты v36. Экран выключенного модуля.
 *
 * Раньше такой экран гас целиком (`return null`): человек открывал раздел
 * по закладке или по ссылке и видел пустую страницу — ни заголовка, ни
 * объяснения, ни ошибки. Пустую страницу не отличить от поломки продукта.
 *
 * Меню выключенные разделы прячет (карта v34), но по прямой ссылке экран
 * всё равно откроется — и должен сказать, что происходит и куда идти.
 */
export function ModuleDisabled() {
  const history = useHistory();

  return (
    <div className="p-6">
      <EmptyState
        icon={<PowerOff className="h-8 w-8" aria-hidden />}
        title={intl.get('module_disabled.title')}
        description={intl.get('module_disabled.description')}
        action={
          <Button onClick={() => history.push(MODULES_SETTINGS_PATH)}>
            {intl.get('module_disabled.open_settings')}
          </Button>
        }
      />
    </div>
  );
}
