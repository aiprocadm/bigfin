import { connect } from 'react-redux';
import { getPurchasesByItemsFilterDrawer } from '@/store/financial-statement/financial-statements.selectors';

export const withPurchasesByItems = (mapState: any) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      purchasesByItemsDrawerFilter: getPurchasesByItemsFilterDrawer(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
