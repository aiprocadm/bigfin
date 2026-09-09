/**
 * Корень хранилища для `useSelector` и `connect`.
 *
 * `react-redux` v7 не знает форму хранилища сам: по умолчанию у него
 * `DefaultRootState` — пустой объект. Поэтому обычное
 * `useSelector((state) => state.dashboard)` не проходит проверку типов, хотя
 * `RootState` в проекте давно посчитан из набора сводителей.
 *
 * Приём — тот, что описан в самом `@types/react-redux`: дополнить
 * `DefaultRootState`. Он чинит **все** места разом, включая те, что стоят под
 * пометкой «не проверять типы» (Д2 карты v82).
 *
 * Рядом лежит `store/hooks.ts` с `useAppSelector` — типизированный крючок для
 * того же самого. Он не ввозится нигде (сирота с карты v80): продукт зовёт
 * `useSelector` напрямую в сотнях мест, и переписывать их — отдельная работа.
 * Пока переписывать нечем, форма объявлена здесь.
 */
import type { RootState } from '@/store/reducers';

declare module 'react-redux' {
  export interface DefaultRootState extends RootState {}
}
