import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { MoreHorizontal, Trash2, Undo2 } from 'lucide-react';

import { Can } from '@/components';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AbilitySubject, CashflowAction } from '@/constants/abilityOption';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { compose } from '@/utils';

import type { CashflowTransactionDetail } from './types';

interface CashflowTransactionHeaderV2Props {
  transaction: CashflowTransactionDetail;
  referenceId?: number | string;
}

// Легаси-HOC без типов: описываем инжектируемые пропсы локально,
// не трогая общий модуль.
interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Шапка деталей денежной операции: заголовок с номером + пилюля типа
 * операции + меню «⋯» с теми же действиями, что и легаси actions-bar
 * (снять категорию, удалить). Имена алертов сохранены 1:1.
 */
function CashflowTransactionHeaderV2Root({
  transaction,
  referenceId,
  openAlert,
}: CashflowTransactionHeaderV2Props & WithAlertActionsProps) {
  // Удаление операции — тот же алерт, что и в легаси.
  const handleDeleteTransaction = () => {
    openAlert('account-transaction-delete', { referenceId });
  };

  // Снятие категории — имя алерта сохранено как в легаси (с опечаткой).
  const handleUncategorizeTransaction = () => {
    openAlert('cashflow-tranaction-uncategorize', {
      uncategorizedTransactionId: transaction.uncategorized_transaction_id,
    });
  };

  return (
    <DrawerHeader className="shrink-0 gap-1 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <DrawerTitle className="text-xl">
          {intl.get('cash_flow.drawer.label_transaction', {
            number: transaction.transaction_number,
          })}
        </DrawerTitle>

        {transaction.transaction_type_formatted ? (
          <Badge variant="secondary">
            {transaction.transaction_type_formatted}
          </Badge>
        ) : null}

        {/* Действия доступны при праве на удаление — как в легаси actions-bar. */}
        <Can I={CashflowAction.Delete} a={AbilitySubject.Cashflow}>
          <span className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-8 sm:w-8"
                  aria-label={intl.get('more_actions')}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                {transaction.uncategorized_transaction_id ? (
                  <>
                    <DropdownMenuItem onClick={handleUncategorizeTransaction}>
                      <Undo2 className="mr-2 h-4 w-4" aria-hidden />
                      {intl.get('uncategorize')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                ) : null}

                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onClick={handleDeleteTransaction}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </Can>
      </div>

      {transaction.formatted_date ? (
        <p className="text-sm text-text-secondary">
          {transaction.formatted_date}
        </p>
      ) : null}
    </DrawerHeader>
  );
}

export const CashflowTransactionHeaderV2 = compose(withAlertActions)(
  CashflowTransactionHeaderV2Root,
) as ComponentType<CashflowTransactionHeaderV2Props>;
