import { connect } from 'react-redux';
import { CLOSE_ALERT, OPEN_ALERT } from '@/store/types';;

export const mapStateToProps = (state: any, props: any) => {
  return {};
};

/**
 * Что обёртка кладёт в свойства предупреждения.
 *
 * Первым видом у `connect` стоит вид подставляемых свойств — иначе место
 * вызова требует передать `openAlert`/`closeAlert` руками (та же причина,
 * что у `withDrawerActions`, Д20 карты v82).
 */
export interface WithAlertActionsProps {
  openAlert: (name: string, payload?: any) => void;
  closeAlert: (name: string, payload?: any) => void;
}

export const mapDispatchToProps = (dispatch: any): WithAlertActionsProps => ({
  openAlert: (name, payload) => dispatch({ type: OPEN_ALERT, name, payload }),
  closeAlert: (name, payload) =>
    dispatch({ type: CLOSE_ALERT, name, payload }),
});

export const withAlertActions = connect<{}, WithAlertActionsProps, {}, any>(
  null,
  mapDispatchToProps,
);