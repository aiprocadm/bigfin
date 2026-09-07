import { connect } from 'react-redux';
import {
  getManualJournalsSelectedRowsFactory,
  getManualJournalsTableStateFactory,
  manualJournalTableStateChangedFactory,
} from '@/store/manual-journals/manual-journals.selectors';

export const withManualJournals = (mapState: any) => {
  const getJournalsTableQuery = getManualJournalsTableStateFactory();
  const manualJournalTableStateChanged =
    manualJournalTableStateChangedFactory();
  const getSelectedRows = getManualJournalsSelectedRowsFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      manualJournalsTableState: getJournalsTableQuery(state, props),
      manualJournalTableStateChanged: manualJournalTableStateChanged(
        state,
      ),
      manualJournalsSelectedRows: getSelectedRows(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
