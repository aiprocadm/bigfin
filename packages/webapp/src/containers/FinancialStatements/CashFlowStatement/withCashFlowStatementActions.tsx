import { connect } from 'react-redux';
import { toggleCashFlowStatementFilterDrawer } from '@/store/financial-statement/financial-statements.actions';

const mapDispatchToProps = (dispatch: any) => ({
  toggleCashFlowStatementFilterDrawer: (toggle: any) =>
    dispatch(toggleCashFlowStatementFilterDrawer(toggle)),
});

export const withCashFlowStatementActions = connect(null, mapDispatchToProps);
