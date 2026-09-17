import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import {
  setExpensesTableState,
  resetExpensesTableState,
  setExpensesSelectedRows,
} from '@/store/expenses/expenses.actions';

/** Что обёртка кладёт в свойства экрана. */
export interface WithExpensesActionsProps {
  setExpensesTableState: (
    state: Parameters<typeof setExpensesTableState>[0],
  ) => void;
  resetExpensesTableState: () => void;
  setExpensesSelectedRows: (selectedRows: unknown[]) => void;
}

const mapDispatchToProps = (dispatch: Dispatch): WithExpensesActionsProps => ({
  setExpensesTableState: (state) => dispatch(setExpensesTableState(state)),
  // Сброс доводов не принимает — раньше сюда передавали состояние, которое
  // действие молча выбрасывало (Д3 карты v85).
  resetExpensesTableState: () => dispatch(resetExpensesTableState()),
  setExpensesSelectedRows: (selectedRows) =>
    dispatch(setExpensesSelectedRows(selectedRows)),
});

export const withExpensesActions = connect<
  {},
  WithExpensesActionsProps,
  {},
  any
>(null, mapDispatchToProps);
