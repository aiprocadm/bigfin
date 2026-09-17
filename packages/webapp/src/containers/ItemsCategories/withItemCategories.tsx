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
    // Без своего отбора отдаём собранное, а не сам отбор: раньше в этой ветке
    // возвращался `mapState` (то есть `undefined`), и обёрнутый вид не получал
    // ничего (Д4 карты v88).
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
