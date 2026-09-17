import React from 'react';
import { Button, Classes, Dialog, Intent } from '@blueprintjs/core';
import { FormattedMessage as T, AppToaster } from '@/components';
import intl from 'react-intl-universal';

import BulkDeleteDialogContent, {
  BulkDeleteDialogPayload,
} from '@/containers/Dialogs/components/BulkDeleteDialogContent';
import { useBulkDeleteAccounts } from '@/hooks/query/accounts';
import withDialogRedux, {
  DialogReduxProps,
} from '@/components/DialogReduxConnect';
import {
  withDialogActions,
  WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { withAccountsTableActions } from '@/containers/Accounts/withAccountsTableActions';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface AccountBulkDeleteDialogProps
  extends DialogReduxProps<BulkDeleteDialogPayload>,
    WithDialogActionsProps {
  // #withAccountsTableActions
  setAccountsSelectedRows: (rows: unknown[]) => void;
}

function AccountBulkDeleteDialog({
  dialogName,
  isOpen,
  payload: {
    ids = [],
    deletableCount = 0,
    undeletableCount = 0,
    totalSelected: totalSelectedInPayload,
  } = {},

  // #withAccountsTableActions
  setAccountsSelectedRows,

  // #withDialogActions
  closeDialog,
}: AccountBulkDeleteDialogProps) {
  // Итог считается здесь, а не значением по умолчанию в разборе свойств:
  // там ссылка на соседний `ids` делает вид разбора «что угодно» (TS7022).
  const totalSelected = totalSelectedInPayload ?? ids.length;

  const { mutateAsync: bulkDeleteAccounts, isLoading } = useBulkDeleteAccounts();

  const handleCancel = () => {
    closeDialog(dialogName);
  };

  const handleConfirmBulkDelete = () => {
    bulkDeleteAccounts({
      ids,
      skipUndeletable: true,
    })
      .then(() => {
        AppToaster.show({
          message: intl.get('the_accounts_has_been_successfully_deleted'),
          intent: Intent.SUCCESS,
        });
        setAccountsSelectedRows([]);
        closeDialog(dialogName);
      })
      .catch(showApiError);
  };

  return (
    <Dialog
      title={
        <T
          id={'bulk_delete_dialog_title'}
          values={{ resourcePlural: intl.get('resource_account_plural') }}
        />
      }
      isOpen={isOpen}
      onClose={handleCancel}
      canEscapeKeyClose={!isLoading}
      canOutsideClickClose={!isLoading}
    >
      <BulkDeleteDialogContent
        totalSelected={totalSelected}
        deletableCount={deletableCount}
        undeletableCount={undeletableCount}
        resourceSingularLabel={intl.get('resource_account_singular')}
        resourcePluralLabel={intl.get('resource_account_plural')}
      />

      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={handleCancel} disabled={isLoading}>
            <T id={'cancel'} />
          </Button>

          <Button
            intent={Intent.DANGER}
            onClick={handleConfirmBulkDelete}
            loading={isLoading}
            disabled={deletableCount === 0 || isLoading}
          >
            <T id={'delete_count'} values={{ count: deletableCount }} />
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default compose(
  withDialogRedux(),
  withDialogActions,
  withAccountsTableActions,
)(AccountBulkDeleteDialog);

