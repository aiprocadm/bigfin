import { connect } from 'react-redux';
import { getCashFlowStatementFilterDrawer } from '@/store/financial-statement/financial-statements.selectors';

export const withCashFlowStatement = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      cashFlowStatementDrawerFilter: getCashFlowStatementFilterDrawer(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
