import { connect } from 'react-redux';
import {
  setCreditNoteTableState,
  resetCreditNoteTableState,
  setCreditNotesSelectedRows,
} from '@/store/credit-note/credit-note.actions';

const mapDipatchToProps = (dispatch: any) => ({
  setCreditNotesTableState: (queries: any) =>
    dispatch(setCreditNoteTableState(queries)),
  resetCreditNotesTableState: () => dispatch(resetCreditNoteTableState()),
  setCreditNotesSelectedRows: (selectedRows: any) => dispatch(setCreditNotesSelectedRows(selectedRows)),
});

export const withCreditNotesActions = connect(null, mapDipatchToProps);
