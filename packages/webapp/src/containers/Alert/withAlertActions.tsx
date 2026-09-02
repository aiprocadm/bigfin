import { connect } from 'react-redux';
import { CLOSE_ALERT, OPEN_ALERT } from '@/store/types';;

export const mapStateToProps = (state: any, props: any) => {
  return {};
};

export const mapDispatchToProps = (dispatch: any) => ({
  openAlert: (name: any, payload: any) => dispatch({ type: OPEN_ALERT, name, payload }),
  closeAlert: (name: any, payload: any) => dispatch({ type: CLOSE_ALERT, name, payload }),
});

export const withAlertActions = connect(null, mapDispatchToProps);