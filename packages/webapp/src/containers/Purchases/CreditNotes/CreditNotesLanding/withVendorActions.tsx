import { connect } from 'react-redux';
import {
  setVendorCreditTableState,
  resetVendorCreditTableState,
} from '@/store/vendor-credit/vendor-credit.actions';

const mapDipatchToProps = (dispatch: any) => ({
  setVendorCreditsTableState: (queries: any) =>
    dispatch(setVendorCreditTableState(queries)),
  resetVendorCreditsTableState: () => dispatch(resetVendorCreditTableState()),
});

export const withVendorActions = connect(null, mapDipatchToProps);
