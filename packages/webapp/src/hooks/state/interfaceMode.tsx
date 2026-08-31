// @ts-nocheck
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useCurrentOrganization } from '@/hooks/state/organizations';
import { useFeatureCan } from '@/hooks/state/feature';
import { Features } from '@/constants/features';
import {
  INTERFACE_MODE,
  shouldExplainAccountantOnly,
} from '@/constants/interfaceMode';

/**
 * Текущий режим интерфейса организации (пусто → business).
 */
export const useInterfaceMode = () => {
  const organization = useCurrentOrganization();
  return organization?.metadata?.interfaceMode ?? INTERFACE_MODE.Business;
};

/**
 * Показать ли объяснение вместо содержимого экрана: открыт accountant-only
 * маршрут, а режим = business (и фича включена).
 *
 * Р2 карты v40. Раньше здесь был страж, который молча подменял адрес на
 * `/`: человек нажимал ссылку и оказывался на главной без единого слова.
 * Теперь адрес сохраняется, а экран говорит, почему он закрыт и где
 * переключается режим.
 */
export const useAccountantOnlyExplained = (): boolean => {
  const location = useLocation();
  const mode = useInterfaceMode();
  const { featureCan } = useFeatureCan();

  return shouldExplainAccountantOnly(
    mode,
    featureCan(Features.InterfaceModes),
    location.pathname,
  );
};
