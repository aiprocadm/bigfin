import React from 'react';
import intl from 'react-intl-universal';
import { Button, Intent } from '@blueprintjs/core';
import {
  AppToaster,
  DataTable,
  DashboardContentTable,
  TableSkeletonHeader,
  TableSkeletonRows,
} from '@/components';

import {
  withAlertActions,
  WithAlertActionsProps,
} from '@/containers/Alert/withAlertActions';
import {
  withDialogActions,
  WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';

import { useBankRulesTableColumns } from './hooks';
import { BankRulesTableActionsMenu } from './_components';
import { BankRulesLandingEmptyState } from './BankRulesLandingEmptyState';
import { useRulesListBoot } from './RulesListBoot';
import { DialogsName } from '@/constants/dialogs';
import { useCloneBankRule, usePauseBankRule } from '@/hooks/query/bank-rules';
import { showApiError } from '@/utils/showApiError';
import { RulesOrderPanel } from './RulesOrderPanel';

/**
 * Retrieves the rules table.
 * @returns {React.ReactNode}
 */
function RulesTable({
  // #withAlertActions
  openAlert,

  // #withDialogAction
  openDialog,
}: WithAlertActionsProps & WithDialogActionsProps) {
  // Invoices table columns.
  const columns = useBankRulesTableColumns();
  const { bankRules, isEmptyState } = useRulesListBoot();
  const [ordering, setOrdering] = React.useState(false);
  const { mutateAsync: pauseRule } = usePauseBankRule();
  const { mutateAsync: cloneRule } = useCloneBankRule();

  // Пауза и копия (FT-035 ТЗ-3).
  const handleTogglePause = (rule: any) =>
    pauseRule({ id: rule.id, paused: !rule.paused_at })
      .then(() =>
        AppToaster.show({
          intent: Intent.SUCCESS,
          message: intl.get(rule.paused_at ? 'banking.rules.resumed' : 'banking.rules.paused_toast'),
        }),
      )
      .catch(showApiError);
  const handleClone = (rule: any) =>
    cloneRule(rule.id)
      .then(() =>
        AppToaster.show({ intent: Intent.SUCCESS, message: intl.get('banking.rules.cloned') }),
      )
      .catch(showApiError);

  // Handle edit bank rule.
  const handleDeleteBankRule = ({ id }: { id: number }) => {
    openAlert('bank-rule-delete', { id });
  };

  // Handle delete bank rule.
  const handleEditBankRule = ({ id }: { id: number }) => {
    openDialog(DialogsName.BankRuleForm, { bankRuleId: id });
  };

  // Применить правило к уже лежащим строкам выписки (FT-034 ТЗ-3).
  const handleApplyToPast = ({ id }: { id: number }) => {
    openDialog(DialogsName.BankRuleApplyToPast, { ruleId: id });
  };

  // Display invoice empty status instead of the table.
  if (isEmptyState) {
    return <BankRulesLandingEmptyState />;
  }

  // Порядок правил (FT-035): отдельный режим списка.
  if (ordering) {
    return (
      <DashboardContentTable>
        <RulesOrderPanel rules={bankRules as any[]} onDone={() => setOrdering(false)} />
      </DashboardContentTable>
    );
  }

  return (
    <DashboardContentTable>
      <div style={{ padding: '8px 16px 0' }}>
        <Button minimal small icon="sort" onClick={() => setOrdering(true)}>
          {intl.get('banking.rules.order.open')}
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={bankRules}
        loading={false}
        headerLoading={false}
        progressBarLoading={false}
        manualSortBy={false}
        selectionColumn={false}
        noInitialFetch={true}
        sticky={true}
        pagination={false}
        manualPagination={false}
        autoResetSortBy={false}
        autoResetPage={false}
        TableLoadingRenderer={TableSkeletonRows}
        TableHeaderSkeletonRenderer={TableSkeletonHeader}
        ContextMenu={BankRulesTableActionsMenu}
        // onCellClick={handleCellClick}
        size={'medium'}
        payload={{
          onDelete: handleDeleteBankRule,
          onEdit: handleEditBankRule,
          onApplyToPast: handleApplyToPast,
          onTogglePause: handleTogglePause,
          onClone: handleClone,
        }}
      />
    </DashboardContentTable>
  );
}

/**
 * Тип указан явно: обёртки сами подставляют всё, что нужно, поэтому снаружи
 * компонент вызывается без свойств (Д9 карты v75). Сборка своя, а не
 * `R.compose` из ramda — та не умеет вычесть подставленные свойства и отдаёт
 * «ничего» (класс карты v84).
 */
export const BankRulesTable: React.FC = compose(
  withAlertActions,
  withDialogActions,
)(RulesTable);
