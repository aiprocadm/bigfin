import {connect} from 'react-redux';
import {
  getItemsTableStateFactory,
  isItemsTableStateChangedFactory,
} from '@/store/items/items.selectors';

export const withItems = (mapState: any) => {
  const getItemsTableState = getItemsTableStateFactory();
  const isItemsTableStateChanged = isItemsTableStateChangedFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      itemsSelectedRows: state.items.selectedRows,
      itemsTableState: getItemsTableState(state, props),
      itemsTableStateChanged: isItemsTableStateChanged(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };

  return connect(mapStateToProps);
};