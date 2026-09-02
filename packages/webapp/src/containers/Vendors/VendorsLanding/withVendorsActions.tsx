import { connect } from 'react-redux';
import {
  setVendorsTableState,
  resetVendorsTableState,
  setVendorsSelectedRows,
  resetVendorsSelectedRows,
} from '@/store/vendors/vendors.actions';

const mapDispatchToProps = (dispatch: any) => ({
  setVendorsTableState: (queries: any) => dispatch(setVendorsTableState(queries)),
  resetVendorsTableState: () => dispatch(resetVendorsTableState()),
  setVendorsSelectedRows: (selectedRows: any) =>
    dispatch(setVendorsSelectedRows(selectedRows)),
  resetVendorsSelectedRows: () => dispatch(resetVendorsSelectedRows()),
});

export const withVendorsActions = connect(null, mapDispatchToProps);
