import { connect } from 'react-redux';
import { getSalesByItemsFilterDrawer } from '@/store/financial-statement/financial-statements.selectors';

export const withSalesByItems = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      salesByItemsDrawerFilter: getSalesByItemsFilterDrawer(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
