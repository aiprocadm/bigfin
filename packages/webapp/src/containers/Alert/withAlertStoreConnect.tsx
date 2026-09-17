import { connect } from 'react-redux';
import {
  isAlertOpenFactory,
  getAlertPayloadFactory,
} from '@/store/dashboard/dashboard.selectors';

/**
 * Свойства, которые получает КАЖДОЕ предупреждение, завёрнутое в
 * `withAlertStoreConnect`.
 *
 * `name` передаёт вызывающий (по нему обёртка и понимает, про какое
 * предупреждение речь), а `isOpen` и `payload` подставляет она сама из
 * хранилища. `payload` — всегда объект: выборщик отдаёт `{ ...alert?.payload }`,
 * то есть пустой объект, пока предупреждение ни разу не открывали. Поля из
 * `TPayload` появляются в нём в момент `openAlert(name, payload)`.
 *
 * То же, что `DialogReduxProps` у окон (Д3 карты v76) и `DrawerReduxProps` у
 * ящиков (Д13 карты v83); до этого каждое предупреждение объявляло эти
 * свойства заново у себя (Д1 карты v85).
 */
export interface AlertReduxProps<TPayload = any> {
  /** Имя предупреждения. Его задаёт тот, кто предупреждение ставит. */
  name: string;
  /** Открыто ли предупреждение сейчас. Подставляет обёртка. */
  isOpen: boolean;
  /** Что предупреждению передали при открытии. Подставляет обёртка. */
  payload: TPayload;
}

export const withAlertStoreConnect = (mapState?: any) => {
  const isAlertOpen = isAlertOpenFactory();
  const getAlertPayload = getAlertPayloadFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      isOpen: isAlertOpen(state, props),
      payload: getAlertPayload(state, props),
    };
    return mapState ? mapState(mapped) : mapped;
  };
  return connect(mapStateToProps);
}