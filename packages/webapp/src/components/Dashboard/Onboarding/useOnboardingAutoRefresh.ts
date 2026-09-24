import React from 'react';
import { useQueryClient } from 'react-query';

import {
  ONBOARDING_QUERY_KEY,
  useMarkOnboardingReportBuilt,
} from '@/hooks/query/onboarding';
import { isFinancialReportQuery } from './onboarding';

/**
 * Счётчик онбординга живёт без перезагрузки страницы (FT-095 ТЗ-3).
 *
 * ПОЧЕМУ ПОДПИСКА, А НЕ ПРАВКА КАЖДОЙ ФОРМЫ. Приёмка требует: добавил
 * счёт — счётчик вырос сразу. Форма счёта сбрасывает кэши списков счетов
 * (`ACCOUNTS`, `CASH_FLOW_ACCOUNTS`), но про онбординг не знает — и знать
 * не должна: шагов восемь, форм, которые их закрывают, десятки (счёт,
 * правило, статья, приглашение, план, загрузка выписки…). Дописывать
 * сброс онбординга в каждую — значит забыть одну. Поэтому слушаем кэш
 * изменений целиком: любое удачное изменение данных перечитывает
 * статус. Запрос лёгкий (восемь `COUNT`), и слушаем мы только пока
 * онбординг не завершён.
 *
 * ОТЧЁТ. У собранного отчёта нет следа в базе, поэтому первый удачный
 * ответ любого отчёта (все они спрашиваются под префиксом
 * `FINANCIAL_REPORT`) ставит личную отметку — один раз.
 */
export function useOnboardingAutoRefresh({
  active,
  reportDone,
}: {
  /** Онбординг показан и не завершён. */
  active: boolean;
  /** Шаг «собрать отчёт» уже отмечен (или пропущен) — слушать незачем. */
  reportDone: boolean;
}): void {
  const client = useQueryClient();
  const markReport = useMarkOnboardingReportBuilt();
  const markReportRef = React.useRef(markReport.mutate);
  markReportRef.current = markReport.mutate;
  // Одно изменение сообщает о себе несколько раз (старт, успех, удаление
  // из кэша через пять минут) — отзываемся на каждое ровно однажды, даже
  // если подписка за это время переоформилась.
  const handledRef = React.useRef(new WeakSet<object>());

  React.useEffect(() => {
    if (!active) return undefined;
    const handled = handledRef.current;

    return client.getMutationCache().subscribe((mutation) => {
      if (!mutation || handled.has(mutation)) return;
      if (mutation.state.status !== 'success') return;
      handled.add(mutation);
      client.invalidateQueries([ONBOARDING_QUERY_KEY]);
    });
  }, [active, client]);

  React.useEffect(() => {
    if (!active || reportDone) return undefined;

    let marked = false;
    return client.getQueryCache().subscribe((event) => {
      if (marked || !event || event.type !== 'queryUpdated') return;
      if (event.action?.type !== 'success') return;
      if (!isFinancialReportQuery(event.query.queryKey)) return;

      marked = true;
      markReportRef.current();
    });
  }, [active, reportDone, client]);
}
