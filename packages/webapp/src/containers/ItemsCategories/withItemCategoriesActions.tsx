import { connect } from 'react-redux';
import { setItemsCategoriesTableState } from '@/store/item-categories/items-category.actions';

export const mapDispatchToProps = (dispatch: any) => ({
  setItemsCategoriesTableState: (state: any) =>
    dispatch(setItemsCategoriesTableState(state)),
});

export const withItemCategoriesActions = connect(null, mapDispatchToProps);
