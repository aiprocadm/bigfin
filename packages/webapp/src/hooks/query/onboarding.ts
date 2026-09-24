// Хуки запросов в этом слое не типизированы: `useApiRequest` описан без
// дженериков, и строгая типизация здесь спорит с ним, а не помогает.
import React from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import useApiRequest from '@/hooks/useRequest';
import { AbilityContext } from '@/components/Dashboard/DashboardAbilityProvider';
import {
  applySkipped,
  nextSkippedList,
  OnboardingStepKey,
  OnboardingStepView,
  toStepViews,
} from '@/components/Dashboard/Onboarding/onboarding';

export const ONBOARDING_QUERY_KEY = 'DASHBOARD_ONBOARDING';

/** Сколько ответ считается свежим: шапка есть на каждом экране. */
const ONBOARDING_STALE_MS = 60_000;

/**
 * Показывать ли онбординг этому человеку (FT-095 ТЗ-3).
 *
 * Только тому, кто может сделать ВСЕ шаги, — «управление всем», то есть
 * владельцу и администратору. Сервер закрыл ручку тем же правом: без
 * этой проверки сотрудник получал бы 403, а 403 включает общий экран «нет
 * доступа». Вне поставщика прав (экран входа, тесты) — «нельзя»: подсказка
 * не стоит риска такого экрана.
 */
export const useCanSeeOnboarding = (): boolean => {
  const ability = React.useContext(AbilityContext) as any;
  return Boolean(ability?.can?.('manage', 'all'));
};

/** Шаги онбординга: отметки считает сервер по данным организации. */
export function useOnboardingStatus() {
  const apiRequest = useApiRequest();
  const canSee = useCanSeeOnboarding();

  return useQuery<OnboardingStepView[], Error>(
    [ONBOARDING_QUERY_KEY],
    () =>
      apiRequest
        .get('dashboard/onboarding', {})
        .then((res: any) => toStepViews(res.data)),
    {
      enabled: canSee,
      staleTime: ONBOARDING_STALE_MS,
      // Подсказка, а не экран: при сбое молчим, а не ломаем шапку.
      retry: false,
    },
  );
}

/**
 * Пропустить шаг или вернуть его.
 *
 * Пропуски — личная настройка человека (`onboardingSkipped` в настройках
 * отображения): новой ручки записи не заводим. Меню отзывается СРАЗУ, до
 * ответа сервера; при сбое прежнее состояние возвращается.
 */
export function useSetOnboardingSkipped() {
  const apiRequest = useApiRequest();
  const client = useQueryClient();

  return useMutation(
    // Сам шаг здесь не нужен: onMutate уже записал его в кэш.
    (_values: { key: OnboardingStepKey; skip: boolean }) => {
      const steps =
        client.getQueryData<OnboardingStepView[]>([ONBOARDING_QUERY_KEY]) ??
        [];
      // Список считается от кэша, который onMutate (он выполняется раньше)
      // уже обновил: две быстрые отметки подряд не затирают друг друга.
      const skipped = steps.filter((s) => s.skipped).map((s) => s.key);
      return (apiRequest as any).put('settings/display-preferences', {
        onboardingSkipped: skipped,
      });
    },
    {
      onMutate: async ({ key, skip }) => {
        await client.cancelQueries([ONBOARDING_QUERY_KEY]);
        const previous = client.getQueryData<OnboardingStepView[]>([
          ONBOARDING_QUERY_KEY,
        ]);
        if (previous) {
          client.setQueryData(
            [ONBOARDING_QUERY_KEY],
            applySkipped(previous, nextSkippedList(previous, key, skip)),
          );
        }
        return { previous };
      },
      onError: (_error, _values, context: any) => {
        if (context?.previous) {
          client.setQueryData([ONBOARDING_QUERY_KEY], context.previous);
        }
      },
      onSettled: () => {
        client.invalidateQueries([ONBOARDING_QUERY_KEY]);
      },
    },
  );
}

/**
 * Отметить «человек собрал отчёт». У отчёта нет следа в базе — он
 * строится на лету, — поэтому отметку ставит витрина.
 */
export function useMarkOnboardingReportBuilt() {
  const apiRequest = useApiRequest();
  const client = useQueryClient();

  return useMutation(
    () =>
      (apiRequest as any).put('settings/display-preferences', {
        onboardingReportBuilt: true,
      }),
    {
      onSuccess: () => client.invalidateQueries([ONBOARDING_QUERY_KEY]),
    },
  );
}
