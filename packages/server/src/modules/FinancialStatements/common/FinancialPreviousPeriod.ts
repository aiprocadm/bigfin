import { sumBy } from 'lodash';
import {
  IFinancialDatePeriodsUnit,
  IFinancialNodeWithPreviousPeriod,
  IFinancialPreviousPeriodTarget,
} from '../types/Report.types';
import * as R from 'ramda';
import { GConstructor } from '@/common/types/Constructor';
import { FinancialSheet } from './FinancialSheet';
import { FinancialDatePeriods } from './FinancialDatePeriods';
import { sameNodeShape } from '../utils/Table.utils';

export const FinancialPreviousPeriod = <T extends GConstructor<FinancialSheet>>(
  Base: T,
) =>
  class extends R.pipe(FinancialDatePeriods)(Base) {
    // ---------------------------
    // # Common Node.
    // ---------------------------
    /**
     * Assoc previous period percentage attribute to account node.
     * @param {IFinancialPreviousPeriodTarget} accountNode
     * @returns {IFinancialNodeWithPreviousPeriod}
     */
    public assocPreviousPeriodPercentageNode = <
      N extends IFinancialPreviousPeriodTarget,
    >(
      accountNode: N,
    ): N & IFinancialNodeWithPreviousPeriod => {
      const percentage = this.getPercentageBasis(
        accountNode.previousPeriod.amount,
        accountNode.previousPeriodChange.amount,
      );
      return sameNodeShape<N & IFinancialNodeWithPreviousPeriod>(
        R.assoc(
          'previousPeriodPercentage',
          this.getPercentageAmountMeta(percentage),
          accountNode,
        ),
      );
    };

    /**
     * Assoc previous period total attribute to account node.
     * @param   {IFinancialPreviousPeriodTarget} accountNode
     * @returns {IFinancialNodeWithPreviousPeriod}
     */
    public assocPreviousPeriodChangeNode = <
      N extends IFinancialPreviousPeriodTarget,
    >(
      accountNode: N,
    ): N & IFinancialNodeWithPreviousPeriod => {
      const change = this.getAmountChange(
        accountNode.total.amount,
        accountNode.previousPeriod.amount,
      );
      return sameNodeShape<N & IFinancialNodeWithPreviousPeriod>(
        R.assoc(
          'previousPeriodChange',
          this.getAmountMeta(change),
          accountNode,
        ),
      );
    };

    /**
     * Assoc previous period percentage attribute to account node.
     *
     * % change = Change ÷ Original Number × 100.
     *
     * @param   {IFinancialPreviousPeriodTarget} accountNode
     * @returns {IFinancialNodeWithPreviousPeriod}
     */
    public assocPreviousPeriodTotalPercentageNode = <
      N extends IFinancialPreviousPeriodTarget,
    >(
      accountNode: N,
    ): N & IFinancialNodeWithPreviousPeriod => {
      const percentage = this.getPercentageBasis(
        accountNode.previousPeriod.amount,
        accountNode.previousPeriodChange.amount,
      );
      return sameNodeShape<N & IFinancialNodeWithPreviousPeriod>(
        R.assoc(
          'previousPeriodPercentage',
          this.getPercentageTotalAmountMeta(percentage),
          accountNode,
        ),
      );
    };

    /**
     * Assoc previous period total attribute to account node.
     * @param   {IFinancialPreviousPeriodTarget} accountNode
     * @returns {IFinancialNodeWithPreviousPeriod}
     */
    public assocPreviousPeriodTotalChangeNode = <
      N extends IFinancialPreviousPeriodTarget,
    >(
      accountNode: N,
    ): N & IFinancialNodeWithPreviousPeriod => {
      const change = this.getAmountChange(
        accountNode.total.amount,
        accountNode.previousPeriod.amount,
      );
      return sameNodeShape<N & IFinancialNodeWithPreviousPeriod>(
        R.assoc(
          'previousPeriodChange',
          this.getTotalAmountMeta(change),
          accountNode,
        ),
      );
    };

    /**
     * Assoc previous year from/to date to horizontal nodes.
     * @param horizNode
     * @returns {IFinancialNodeWithPreviousPeriod}
     */
    public assocPreviousPeriodHorizNodeFromToDates = R.curry(
      (
        periodUnit: IFinancialDatePeriodsUnit,
        horizNode: any,
      ): IFinancialNodeWithPreviousPeriod => {
        const { fromDate: PPFromDate, toDate: PPToDate } =
          this.getPreviousPeriodDateRange(
            horizNode.fromDate.date,
            horizNode.toDate.date,
            periodUnit,
          );
        return R.compose(
          R.assoc('previousPeriodToDate', this.getDateMeta(PPToDate)),
          R.assoc('previousPeriodFromDate', this.getDateMeta(PPFromDate)),
        )(horizNode);
      },
    );

    /**
     * Retrieves PP total sumation of the given horiz index node.
     * @param {number} index
     * @param node
     * @returns {number}
     */
    public getPPHorizNodesTotalSumation = (index: number, node): number => {
      return sumBy(
        node.children,
        `horizontalTotals[${index}].previousPeriod.amount`,
      );
    };
  };
