import { connect } from 'react-redux';
import {
  setManualJournalsTableState,
  setManualJournalsSelectedRows,
} from '@/store/manual-journals/manual-journals.actions';

const mapActionsToProps = (dispatch: any) => ({
  setManualJournalsTableState: (queries: any) =>
    dispatch(setManualJournalsTableState(queries)),
  setManualJournalsSelectedRows: (selectedRows: any) =>
    dispatch(setManualJournalsSelectedRows(selectedRows)),
});

export const withManualJournalsActions = connect(null, mapActionsToProps);
