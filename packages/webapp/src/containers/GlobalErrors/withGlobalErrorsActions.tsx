import { connect } from 'react-redux';
import { setGlobalErrors } from '@/store/global-errors/global-errors.actions';

export const mapDispatchToProps = (dispatch: any) => ({
  globalErrorsSet: (errors: any) => dispatch(setGlobalErrors(errors)),
});

export const withGlobalErrorsActions = connect(null, mapDispatchToProps);
