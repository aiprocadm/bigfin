import { connect } from 'react-redux';
import {
  toggleGeneralLedgerFilterDrawer,
} from '@/store/financial-statement/financial-statements.actions';

const mapDispatchToProps = (dispatch: any) => ({
  toggleGeneralLedgerFilterDrawer: (toggle: any) =>
    dispatch(toggleGeneralLedgerFilterDrawer(toggle)),
});

export const withGeneralLedgerActions = connect(null, mapDispatchToProps);
