import { connect } from 'react-redux';
import { toggleAPAgingSummaryFilterDrawer } from '@/store/financial-statement/financial-statements.actions';

const mapActionsToProps = (dispatch: any) => ({
  toggleAPAgingSummaryFilterDrawer: (toggle: any) =>
    dispatch(toggleAPAgingSummaryFilterDrawer(toggle)),
});

export const withAPAgingSummaryActions = connect(null, mapActionsToProps);
