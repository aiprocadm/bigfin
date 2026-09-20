import React from 'react';

import useApiRequest from '@/hooks/useRequest';
import { setDisplayPreferences } from '@/utils/displayPreferences';

/**
 * Загружает личные настройки вида один раз при входе (FIN-026 ТЗ-2).
 *
 * ЗАЧЕМ ЗДЕСЬ, А НЕ НА ЭКРАНЕ НАСТРОЕК. Настройки влияют на печать сумм во
 * ВСЁМ продукте, а экран настроек человек открывает раз в жизни. Пока их
 * читал только он, галочка «отображать копейки» сохранялась и не меняла
 * ничего.
 *
 * ОТВЕТА НЕ ЖДЁМ. До него действуют значения по умолчанию — «как было».
 * Задерживать ради галочки показ всего продукта незачем, а сбой запроса не
 * должен мешать работать: настройка вида не критична.
 */
export function useDisplayPreferencesBoot(): void {
  const apiRequest = useApiRequest();

  React.useEffect(() => {
    let cancelled = false;

    (apiRequest as any)
      .get('settings/display-preferences', {})
      .then((response: any) => {
        if (cancelled) return;

        setDisplayPreferences(response?.data?.data ?? response?.data ?? {});
      })
      .catch(() => {
        // Молчим намеренно: человек пришёл работать, а не читать про
        // неудачу загрузки галочек.
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
