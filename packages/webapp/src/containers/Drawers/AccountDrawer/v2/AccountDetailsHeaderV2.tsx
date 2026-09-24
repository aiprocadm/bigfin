import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import {
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';

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
import { AbilitySubject, AccountAction } from '@/constants/abilityOption';
import { DialogsName } from '@/constants/dialogs';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { AccountDialogAction } from '@/containers/Dialogs/AccountDialog/utils';
import { compose } from '@/utils';

import type { AccountDetail } from './types';
import { accountTypeLabel } from '@/utils/accountTypeLabel';
import {
  accountSupportsTaxRegime,
  accountTaxRegimeLabel,
} from '@/constants/accountTaxRegimes';

interface AccountDetailsHeaderV2Props {
  account: AccountDetail;
  accountId: number;
}

// Легаси-HOC (@ts подавлен в модуле) не экспортирует типы инжектируемых
// пропсов — описываем локально, не трогая общий модуль.
interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Шапка деталей счёта: название + код + статус-пилюля + «Редактировать» +
 * меню «⋯» с теми же действиями, что и легаси actions-bar (дочерний счёт,
 * активация/деактивация, удаление). Диалоги и алерты открываются поверх
 * drawer'а — сам drawer не закрывается (как в легаси).
 */
function AccountDetailsHeaderV2Root({
  account,
  accountId,
  openAlert,
  openDialog,
}: AccountDetailsHeaderV2Props &
  WithAlertActionsProps &
  WithDialogActionsProps) {
  const handleEditAccount = () => {
    openDialog(DialogsName.AccountForm, {
      action: AccountDialogAction.Edit,
      accountId,
    });
  };
  const handleNewChildAccount = () => {
    openDialog(DialogsName.AccountForm, {
      action: AccountDialogAction.NewChild,
      parentAccountId: accountId,
      accountType: account.account_type,
    });
  };
  const handleDeleteAccount = () => {
    openAlert('account-delete', { accountId });
  };
  const handleInactivateAccount = () => {
    openAlert('account-inactivate', { accountId });
  };
  const handleActivateAccount = () => {
    openAlert('account-activate', { accountId });
  };

  return (
    <DrawerHeader className="shrink-0 gap-1 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <DrawerTitle className="text-xl">{account.name}</DrawerTitle>

        {account.code ? (
          <span className="text-sm tabular-nums text-text-muted">
            {account.code}
          </span>
        ) : null}

        <Badge variant={account.active ? 'secondary' : 'outline'}>
          {intl.get(account.active ? 'active' : 'inactive')}
        </Badge>

        <span className="ml-auto flex items-center gap-2">
          <Can I={AccountAction.Edit} a={AbilitySubject.Account}>
            <Button variant="secondary" size="sm" onClick={handleEditAccount}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {intl.get('edit_account')}
            </Button>
          </Can>

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
              <Can I={AccountAction.Edit} a={AbilitySubject.Account}>
                <DropdownMenuItem onClick={handleNewChildAccount}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('new_child_account')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </Can>

              {/* Активация/деактивация в легаси не были под Can — сохраняем. */}
              {account.active ? (
                <DropdownMenuItem onClick={handleInactivateAccount}>
                  <Pause className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('inactivate_account')}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleActivateAccount}>
                  <Play className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('activate_account')}
                </DropdownMenuItem>
              )}

              <Can I={AccountAction.Delete} a={AbilitySubject.Account}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onClick={handleDeleteAccount}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('delete_account')}
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

      {/* Подпись типа — из словаря по ключу: сервер отдаёт её по-английски
          (С1 карты v29). */}
      {accountTypeLabel(account.account_type, account.account_type_label) ? (
        <p className="text-sm text-text-secondary">
          {accountTypeLabel(account.account_type, account.account_type_label)}
        </p>
      ) : null}

      {/* Налоговый режим денежного счёта (FT-070 ТЗ-3). Не выбран — пишем
          это прямо: «как у организации» тоже ответ, и человеку видно, по
          какой ставке считается оценка налога. */}
      {accountSupportsTaxRegime(account.account_type) ? (
        <p className="text-sm text-text-secondary">
          {intl.get('accounts.tax_regime.label')}:{' '}
          {accountTaxRegimeLabel(account.tax_regime) ||
            intl.get('accounts.tax_regime.as_organization')}
        </p>
      ) : null}
    </DrawerHeader>
  );
}

export const AccountDetailsHeaderV2 = compose(
  withDialogActions,
  withAlertActions,
)(AccountDetailsHeaderV2Root) as ComponentType<AccountDetailsHeaderV2Props>;
