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

export const withDrawerActions = connect(null, mapDispatchToProps);
