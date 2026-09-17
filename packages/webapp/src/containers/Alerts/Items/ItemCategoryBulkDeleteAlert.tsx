import React, { useState } from 'react';
import intl from 'react-intl-universal';
import { FormattedHTMLMessage } from '@/components';
import { Intent, Alert } from '@blueprintjs/core';
import { size } from 'lodash';
import { AppToaster } from '@/components';

import { withItemCategoriesActions } from '@/containers/ItemsCategories/withItemCategoriesActions';
import {
  withAlertStoreConnect,
  AlertReduxProps,
} from '@/containers/Alert/withAlertStoreConnect';
import {
  withAlertActions,
  WithAlertActionsProps,
} from '@/containers/Alert/withAlertActions';

import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

/**
 * ЭТОТ ПУТЬ МЁРТВ ЦЕЛИКОМ (Д3 карты v88), удаление предложено владельцу:
 *
 * - имени `item-categories-bulk-delete` нет в реестре `ItemsCategoriesAlerts`,
 *   значит предупреждение никогда не рисуется;
 * - сам файл не импортируется нигде;
 * - действие `requestDeleteBulkItemCategories` не существует во всём коде —
 *   обёртка `withItemCategoriesActions` даёт только настройку таблицы;
 * - на сервере ручки массового удаления категорий нет, только по одной;
 * - кнопка, которая его открывает, не показывается: выделение строк категорий
 *   нигде не хранится.
 *
 * Оставлено как есть, чтобы ничего не удалять без разрешения.
 */
type ItemCategoryBulkDeleteAlertProps = AlertReduxProps<{
  itemCategoriesIds: number[];
}> &
  WithAlertActionsProps & {
    /** Действия не существует — см. пояснение выше. */
    requestDeleteBulkItemCategories: (ids: number[]) => Promise<unknown>;
  };

/**
 * Item category bulk delete alerts.
 */
function ItemCategoryBulkDeleteAlert({
  name,

  // #withAlertStoreConnect
  isOpen,
  payload: { itemCategoriesIds },

  // #withItemCategoriesActions
  requestDeleteBulkItemCategories,

  // #withAlertActions
  closeAlert,
}: ItemCategoryBulkDeleteAlertProps) {
  
  const [isLoading, setLoading] = useState(false);

  // handle cancel bulk delete alert.
  const handleCancelBulkDelete = () => {
    closeAlert(name);
  };

  // handle confirm itemCategories bulk delete.
  const handleConfirmBulkDelete = () => {
    setLoading(true);
    requestDeleteBulkItemCategories(itemCategoriesIds)
      .then(() => {
        AppToaster.show({
          message: intl.get('the_item_categories_has_been_deleted_successfully'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(showApiError)
      .finally(() => {
        closeAlert(name);
        setLoading(false);
      });
  };
  return (
    <Alert
      cancelButtonText={intl.get('cancel')}
      confirmButtonText={intl.get('delete_count', {
        count: size(itemCategoriesIds),
      })}
      icon="trash"
      intent={Intent.DANGER}
      isOpen={isOpen}
      onCancel={handleCancelBulkDelete}
      onConfirm={handleConfirmBulkDelete}
      loading={isLoading}
    >
      <p>
        <FormattedHTMLMessage
          id={
            'once_delete_these_item_categories_you_will_not_able_restore_them'
          }
        />
      </p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
  withItemCategoriesActions,
)(ItemCategoryBulkDeleteAlert);
