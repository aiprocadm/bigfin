import { connect } from 'react-redux';
import { getVendorsTransactionsFilterDrawer } from '@/store/financial-statement/financial-statements.selectors';

export const withVendorsTransaction = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      vendorsTransactionsDrawerFilter: getVendorsTransactionsFilterDrawer(
        state,
      ),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
