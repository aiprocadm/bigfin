import { connect } from 'react-redux';
import { getInventoryItemDetailsFilterDrawer } from '@/store/financial-statement/financial-statements.selectors';

export const withInventoryItemDetails = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      inventoryItemDetailDrawerFilter: getInventoryItemDetailsFilterDrawer(
        state,
      ),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
