import { connect } from 'react-redux';
import { getBalanceSheetFilterDrawer } from '@/store/financial-statement/financial-statements.selectors';

export const withBalanceSheet = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      balanceSheetDrawerFilter: getBalanceSheetFilterDrawer(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };

  return connect(mapStateToProps);
};
