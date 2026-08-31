// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Calculator } from 'lucide-react';

import { Button } from './button';
import { EmptyState } from './empty-state';

/** Где переключают режим интерфейса. */
const INTERFACE_MODE_SETTINGS_PATH = '/preferences/interface-mode';

/**
 * Р2 карты v40. Экран, скрытый режимом интерфейса, объясняет себя.
 *
 * Раньше страж маршрута молча заменял адрес на `/`: человек нажимал
 * карточку в отчётах или открывал закладку — и оказывался на главной без
 * единого слова. Молчаливая подмена адреса неотличима от поломки.
 *
 * Правило продукта «выключенный раздел объясняет себя» (карта v36) здесь
 * то же самое: режим человек выбрал сам и сам может переключить.
 */
export function AccountantOnly() {
  const history = useHistory();

  return (
    <div className="p-6">
      <EmptyState
        icon={<Calculator className="h-8 w-8" aria-hidden />}
        title={intl.get('accountant_only.title')}
        description={intl.get('accountant_only.description')}
        action={
          <Button onClick={() => history.push(INTERFACE_MODE_SETTINGS_PATH)}>
            {intl.get('accountant_only.open_settings')}
          </Button>
        }
      />
    </div>
  );
}
