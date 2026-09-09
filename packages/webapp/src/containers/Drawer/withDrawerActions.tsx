import { connect } from 'react-redux';
import { CLOSE_DRAWER, OPEN_DRAWER } from '@/store/types';;

export const mapStateToProps = (state: any, props: any) => {
  return {};
};

export const mapDispatchToProps = (dispatch: any) => ({
  openDrawer: (name: any, payload: any) =>
    dispatch({ type: OPEN_DRAWER, name, payload }),
  closeDrawer: (name: any, payload: any) =>
    dispatch({ type: CLOSE_DRAWER, name, payload }),
});

/**
 * Первым видом стоит вид подставляемых свойств. Без него `connect` не считает
 * `openDrawer`/`closeDrawer` подставленными, и место вызова требует передать
 * их руками (Д20 карты v82) — та же ошибка, что у `withBankingActions`.
 */
export interface WithDrawerActionsProps {
  openDrawer: (name: any, payload?: any) => void;
  closeDrawer: (name: any, payload?: any) => void;
}

export const withDrawerActions = connect<
  {},
  WithDrawerActionsProps,
  {},
  any
>(null, mapDispatchToProps);
