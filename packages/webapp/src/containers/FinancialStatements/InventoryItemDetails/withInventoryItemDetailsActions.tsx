import { connect } from 'react-redux';
import { toggleInventoryItemDetailsFilterDrawer } from '@/store/financial-statement/financial-statements.actions';

const mapActionsToProps = (dispatch: any) => ({
  toggleInventoryItemDetailsFilterDrawer: (toggle: any) =>
    dispatch(toggleInventoryItemDetailsFilterDrawer(toggle)),
});

export const withInventoryItemDetailsActions = connect(null, mapActionsToProps);
