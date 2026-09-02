import { connect } from 'react-redux';
import { getInventroyAdjsTableStateFactory } from '@/store/inventory-adjustments/inventory-adjustment.selector';

export const withInventoryAdjustments = (mapState: any) => {
  const getInventoryAdjustmentTableState = getInventroyAdjsTableStateFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      inventoryAdjustmentTableState: getInventoryAdjustmentTableState(
        state,
        props,
      ),
      inventoryAdjustmentsSelectedRows: state.inventoryAdjustments.selectedRows,
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
