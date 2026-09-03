import { connect } from 'react-redux';
import { toggleJournalSheeetFilterDrawer } from '@/store/financial-statement/financial-statements.actions';

export const mapDispatchToProps = (dispatch: any) => ({
  toggleJournalSheetFilter: (toggle: any) =>
    dispatch(toggleJournalSheeetFilterDrawer(toggle)),
});

export const withJournalActions = connect(null, mapDispatchToProps);
