import { connect } from 'react-redux';
import {
  getItemsCategoriesTableStateFactory,
} from '@/store/item-categories/items-categories.selectors';

export const withItemCategories = (mapState: any) => {
  const getItemsCategoriesTableState = getItemsCategoriesTableStateFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {  
      itemsCategoriesTableState: getItemsCategoriesTableState(state, props),
    };
    return mapState ? mapState(mapped, state, props) : mapState;
  };
  return connect(mapStateToProps);
};
