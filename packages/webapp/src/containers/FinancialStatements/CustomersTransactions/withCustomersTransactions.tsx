import { connect } from 'react-redux';
import { getCustomersTransactionsFilterDrawer } from '@/store/financial-statement/financial-statements.selectors';

export const withCustomersTransactions = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      customersTransactionsDrawerFilter: getCustomersTransactionsFilterDrawer(
        state,
      ),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
