import { connect } from 'react-redux';
import {
  expensesTableStateChangedFactory,
  getExpensesSelectedRowsFactory,
  getExpensesTableStateFactory,
} from '@/store/expenses/expenses.selectors';

export const withExpenses = (mapState: any) => {
  const getExpensesTableState = getExpensesTableStateFactory();
  const expensesTableStateChanged = expensesTableStateChangedFactory();
  const getSelectedRows = getExpensesSelectedRowsFactory();

  const mapStateToProps = (state: any, props: any) => {
    const mapped = {
      expensesTableState: getExpensesTableState(state, props),
      expensesTableStateChanged: expensesTableStateChanged(state),
      expensesSelectedRows: getSelectedRows(state),
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
