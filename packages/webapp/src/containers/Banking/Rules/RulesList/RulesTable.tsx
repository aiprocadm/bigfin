import {
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

  return (
    <DashboardContentTable>
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
