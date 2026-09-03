import { connect } from 'react-redux';
import {
  setItemsTableState,
  resetItemsTableState,
  setItemsSelectedRows,
} from '@/store/items/items.actions';

export const mapDispatchToProps = (dispatch: any) => ({
  setItemsTableState: (queries: any) => dispatch(setItemsTableState(queries)),
  resetItemsTableState: () => dispatch(resetItemsTableState()),
  setItemsSelectedRows: (selectedRows: any) => dispatch(setItemsSelectedRows(selectedRows)),
});

export const withItemsActions = connect(null, mapDispatchToProps);
