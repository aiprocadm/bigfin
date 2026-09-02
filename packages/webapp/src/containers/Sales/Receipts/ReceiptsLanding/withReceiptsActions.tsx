import { connect } from 'react-redux';
import {
  setReceiptsTableState,
  resetReceiptsTableState,
  setReceiptsSelectedRows,
} from '@/store/receipts/receipts.actions';

const mapDispatchToProps = (dispatch: any) => ({
  setReceiptsTableState: (queries: any) => dispatch(setReceiptsTableState(queries)),
  resetReceiptsTableState: () => dispatch(resetReceiptsTableState()),
  setReceiptsSelectedRows: (selectedRows: any) =>
    dispatch(setReceiptsSelectedRows(selectedRows)),
});

export const withReceiptsActions = connect(null, mapDispatchToProps);
