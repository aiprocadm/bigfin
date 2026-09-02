import { connect } from 'react-redux';
import { toggleSalesTaxLiabilitySummaryFilterDrawer } from '@/store/financial-statement/financial-statements.actions';

const mapDispatchToProps = (dispatch: any) => ({
  toggleSalesTaxLiabilitySummaryFilterDrawer: (toggle: any) =>
    dispatch(toggleSalesTaxLiabilitySummaryFilterDrawer(toggle)),
});

export const withSalesTaxLiabilitySummaryActions = connect(null, mapDispatchToProps);
