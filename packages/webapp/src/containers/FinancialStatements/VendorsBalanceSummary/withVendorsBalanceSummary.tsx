import { connect } from 'react-redux';
import { getVendorsBalanceSummaryFilterDrawer } from '@/store/financial-statement/financial-statements.selectors';

export const withVendorsBalanceSummary = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      VendorsSummaryFilterDrawer: getVendorsBalanceSummaryFilterDrawer(
        state,
      ),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
