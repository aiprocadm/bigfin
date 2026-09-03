import { connect } from 'react-redux';
import {
  setVendorCreditTableState,
  resetVendorCreditTableState,
  setVendorCreditsSelectedRows,
} from '@/store/vendor-credit/vendor-credit.actions';

const mapDispatchToProps = (dispatch: any) => ({
  setVendorsCreditNoteTableState: (queries: any) =>
    dispatch(setVendorCreditTableState(queries)),
  resetVendorsCreditNoteTableState: () =>
    dispatch(resetVendorCreditTableState()),
  setVendorsCreditNoteSelectedRows: (selectedRows: any) =>
    dispatch(setVendorCreditsSelectedRows(selectedRows)),
});

export const withVendorsCreditNotesActions = connect(null, mapDispatchToProps);
