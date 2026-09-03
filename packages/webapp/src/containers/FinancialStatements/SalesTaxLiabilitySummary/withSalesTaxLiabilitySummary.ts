import { connect } from 'react-redux';
import { getSalesTaxLiabilitySummaryFilterDrawer } from '@/store/financial-statement/financial-statements.selectors';

export const withSalesTaxLiabilitySummary = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      salesTaxLiabilitySummaryFilter:
        getSalesTaxLiabilitySummaryFilterDrawer(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };

  return connect(mapStateToProps);
};
