import * as R from 'ramda';
import {
  IBalanceSheetDataNode,
  IBalanceSheetSchemaNode,
} from './BalanceSheet.types';
import { GConstructor } from '@/common/types/Constructor';
import { FinancialSheet } from '../../common/FinancialSheet';
import { BalanceSheetQuery } from './BalanceSheetQuery';

export const BalanceSheetBase = <T extends GConstructor<FinancialSheet>>(
  Base: T,
) =>
  class BalanceSheetBase extends Base {
    query: BalanceSheetQuery;

    /**
     * Determines the node type of the given schema node.
     * @param {IBalanceSheetStructureSection} node -
     * @param {string} type -
     * @return {boolean}
     */
    public isSchemaNodeType = R.curry(
      (type: string, node: IBalanceSheetSchemaNode): boolean => {
        return node.type === type;
      },
    );
    /**
     * Determines the node type of the given schema node.
     * @param {IBalanceSheetStructureSection} node -
     * @param {string} type -
     * @return {boolean}
     */
    public isNodeType = R.curry(
      (type: string, node: IBalanceSheetDataNode): boolean => {
        return node.nodeType === type;
      },
    );
    /**
     * Determines the given display columns by type.
     * @param {string} displayColumnsBy
     * @returns {boolean}
     */
    public isDisplayColumnsBy = (displayColumnsBy: string): boolean => {
      // БЫЛО: `this.query.displayColumnsType === displayColumnsBy`.
      //
      // `this.query` здесь — не сам запрос, а обёртка `BalanceSheetQuery`;
      // поля `displayColumnsType` у неё нет (оно лежит внутри, в
      // `query.query`). Сравнение всегда получалось `undefined === 'что-то'`,
      // то есть ВСЕГДА «нет».
      //
      // Чем это оборачивалось: по этому ответу баланс выбирает, брать
      // значения ячеек по периодам или одной итоговой колонкой
      // (`BalanceSheetTable.commonColumnsAccessors`). Заголовки колонок при
      // этом строятся другим путём, который работал правильно. Выбрал человек
      // «по периодам» — шапка показывала периоды, а значения приходили из
      // итоговой колонки.
      //
      // Сравниваемое поле оставлено прежним (`displayColumnsType`): именно его
      // и хотел автор — сюда передают «total» или «date_periods», а не единицу
      // периода.
      return this.query.isDisplayColumnsType(displayColumnsBy);
    };
  };
