import { connect } from 'react-redux';
import {
  getCreditNotesTableStateFactory,
  isCreditNotesTableStateChangedFactory,
} from '@/store/credit-note/credit-note.selector';

export const withCreditNotes = (mapState: any) => {
  const getCreditNoteTableState = getCreditNotesTableStateFactory();
  const isCreditNoteTableChanged = isCreditNotesTableStateChangedFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      creditNoteTableState: getCreditNoteTableState(state, props),
      creditNoteTableStateChanged: isCreditNoteTableChanged(state),
      creditNotesSelectedRows: state.creditNotes?.selectedRows || [],
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
