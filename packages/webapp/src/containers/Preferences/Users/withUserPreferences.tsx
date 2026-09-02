import { connect } from 'react-redux';
import { CLOSE_DIALOG, OPEN_DIALOG } from '@/store/types';;

export const mapStateToProps = (state: any, props: any) => {};

export const mapDispatchToProps = (dispatch: any) => ({
  openDialog: (name: any, payload: any) =>
    dispatch({ type: OPEN_DIALOG, name, payload }),
  closeDialog: (name: any, payload: any) =>
    dispatch({ type: CLOSE_DIALOG, name, payload }),
});

export const withUserPreferences = connect(null, mapDispatchToProps);
