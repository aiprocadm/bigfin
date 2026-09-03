import { connect } from 'react-redux';
import { setInventoryAdjustmentsTableState } from '@/store/inventory-adjustments/inventory-adjustment.actions';

const mapDispatchToProps = (dispatch: any) => ({
  setInventoryAdjustmentTableState: (queries: any) =>
    dispatch(setInventoryAdjustmentsTableState(queries)),
});

export const withInventoryAdjustmentActions = connect(null, mapDispatchToProps);
