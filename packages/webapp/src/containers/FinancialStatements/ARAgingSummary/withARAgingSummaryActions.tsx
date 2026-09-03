import { connect } from 'react-redux';
import { toggleARAgingSummaryFilterDrawer } from '@/store/financial-statement/financial-statements.actions';

const mapActionsToProps = (dispatch: any) => ({
  toggleARAgingSummaryFilterDrawer: (toggle: any) => 
    dispatch(toggleARAgingSummaryFilterDrawer(toggle)),
});

export const withARAgingSummaryActions = connect(null, mapActionsToProps);
