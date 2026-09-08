import { connect } from 'react-redux';
import {
  isDialogOpenFactory,
  getDialogPayloadFactory,
} from '@/store/dashboard/dashboard.selectors';

/**
 * Свойства, которые получает КАЖДОЕ окно, завёрнутое в `withDialogRedux`.
 *
 * `dialogName` передаёт вызывающий (по нему обёртка и понимает, про какое окно
 * речь), а `isOpen` и `payload` подставляет она сама из хранилища.
 *
 * Раньше общего объявления не было, и каждое из девяноста пяти окон объявляло
 * эти три свойства заново — или, чаще, не объявляло вовсе (Д3 карты v76).
 */
export interface DialogReduxProps<TPayload = any> {
  /** Имя окна. Его задаёт тот, кто окно ставит. */
  dialogName: string;
  /** Открыто ли окно сейчас. Подставляет обёртка. */
  isOpen?: boolean;
  /** Что окну передали при открытии. Подставляет обёртка. */
  payload?: TPayload;
}

export default (mapState?: any) => {
  const isDialogOpen = isDialogOpenFactory();
  const getDialogPayload = getDialogPayloadFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      isOpen: isDialogOpen(state, props),
      payload: getDialogPayload(state, props),
    };
    return mapState ? mapState(mapped) : mapped;
  };
  return connect(mapStateToProps);
};
