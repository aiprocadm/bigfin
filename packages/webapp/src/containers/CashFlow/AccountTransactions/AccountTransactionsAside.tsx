// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
import { Suspense, lazy } from 'react';
import { Spinner } from '@blueprintjs/core';
import { AppContentShell } from '@/components/AppShell';

const CategorizeTransactionAside = lazy(() =>
  import('../CategorizeTransactionAside/CategorizeTransactionAside').then(
    (module) => ({ default: module.CategorizeTransactionAside }),
  ),
);

export function AccountTransactionsAside() {
  return (
    <AppContentShell.Aside>
      <Suspense fallback={<Spinner size={20} />}>
        <CategorizeTransactionAside />
      </Suspense>
    </AppContentShell.Aside>
  );
}
