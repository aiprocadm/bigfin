import { connect } from 'react-redux';
import { getCustomersBalanceSummaryFilterDrawer } from '@/store/financial-statement/financial-statements.selectors';

export const withCustomersBalanceSummary = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      customersBalanceDrawerFilter: getCustomersBalanceSummaryFilterDrawer(
        state,
      ),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
