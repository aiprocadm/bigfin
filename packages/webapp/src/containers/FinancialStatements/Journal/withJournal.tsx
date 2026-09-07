import { connect } from 'react-redux';
import {
  getJournalFilterDrawer,
} from '@/store/financial-statement/financial-statements.selectors';

export const withJournal = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      journalSheetDrawerFilter: getJournalFilterDrawer(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
