import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { handleDeleteErrors } from '@/containers/Items/utils';
import { withItemsActions } from '@/containers/Items/withItemsActions';
import { useDeleteItem } from '@/hooks/query';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

interface ItemDeleteAlertProps {
  name: string;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: { itemId?: number | string };
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}
interface WithItemsActionsProps {
  setItemsTableState: (state: { page: number }) => void;
}
interface WithDrawerActionsProps {
  closeDrawer: (name: string) => void;
}

/** Ответ API с типизированными ошибками удаления. */
interface ApiErrorResponse {
  response?: { data?: { errors?: { type: string }[] } };
}

/**
 * Подтверждение удаления позиции (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('item-delete', { itemId }).
 */
function ItemDeleteAlertRoot({
  name,
  isOpen,
  payload,
  closeAlert,
  setItemsTableState,
  closeDrawer,
}: ItemDeleteAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps &
  WithItemsActionsProps &
  WithDrawerActionsProps) {
  // Легаси-хук мутации без типов — уточняем сигнатуру локально.
  const { mutateAsync: deleteItem, isLoading } = useDeleteItem(
    {},
  ) as unknown as {
    mutateAsync: (id?: number | string) => Promise<unknown>;
    isLoading: boolean;
  };
  const itemId = payload?.itemId;

  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: удаляем позицию, показываем тост, сбрасываем страницу
  // таблицы на первую и закрываем drawer.
  const handleConfirm = () => {
    deleteItem(itemId)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_item_has_been_deleted_successfully'),
          intent: Intent.SUCCESS,
        });
        // Возвращаемся на первую страницу таблицы.
        setItemsTableState({ page: 1 });
        closeDrawer(DRAWERS.ITEM_DETAILS);
      })
      .catch((error: ApiErrorResponse) => {
        const errors = error.response?.data?.errors;
        if (errors) {
          handleDeleteErrors(errors);
        } else {
          showApiError(error);
        }
      })
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('delete_item')}
      description={intl.getHTML(
        'once_delete_this_item_you_will_able_to_restore_it',
      )}
      confirmLabel={intl.get('delete')}
      intent="danger"
      loading={isLoading}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}

// withAlertStoreConnect — легаси-HOC (без типов): mapState фактически
// необязателен, кастуем сигнатуру локально, не трогая общий модуль.
const withAlertStoreConnectLoose = withAlertStoreConnect as unknown as (
  mapState?: unknown,
) => (component: ComponentType<any>) => ComponentType<{ name: string }>;

export default compose(
  withAlertStoreConnectLoose(),
  withAlertActions,
  withItemsActions,
  withDrawerActions,
)(ItemDeleteAlertRoot) as ComponentType<ItemDeleteAlertProps>;
