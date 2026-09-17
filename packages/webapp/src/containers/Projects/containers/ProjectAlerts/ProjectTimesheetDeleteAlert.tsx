import React from 'react';
import intl from 'react-intl-universal';
import { FormattedHTMLMessage } from '@/components';
import { Intent, Alert } from '@blueprintjs/core';
import { AppToaster } from '@/components';
import { useDeleteProjectTimeEntry } from '../../hooks';

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

type ProjectTimesheetDeleteAlertProps = AlertReduxProps<{
  timesheetId: number;
}> &
  WithAlertActionsProps;

/**
 * Project timesheet delete alert.
 * @returns
 */
function ProjectTimesheetDeleteAlert({
  name,

  // #withAlertStoreConnect
  isOpen,
  payload: { timesheetId },

  // #withAlertActions
  closeAlert,
}: ProjectTimesheetDeleteAlertProps) {
  const { mutateAsync: deleteProjectTimeEntryMutate, isLoading } =
    useDeleteProjectTimeEntry();

  // handle cancel delete alert.
  const handleCancelDeleteAlert = () => {
    closeAlert(name);
  };

  // handleConfirm delete project time sheet.
  const handleConfirmProjectTimesheetDelete = () => {
    deleteProjectTimeEntryMutate(timesheetId)
      .then(() => {
        AppToaster.show({
          message: intl.get('project_time_entry.alert.delete_message'),
          intent: Intent.SUCCESS,
        });
      })
      // Отказ сервера показываем, а не глотаем (Д1 карты v88).
      .catch(showApiError)
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <Alert
      cancelButtonText={intl.get('cancel')}
      confirmButtonText={intl.get('delete')}
      icon="trash"
      intent={Intent.DANGER}
      isOpen={isOpen}
      onCancel={handleCancelDeleteAlert}
      onConfirm={handleConfirmProjectTimesheetDelete}
      loading={isLoading}
    >
      <p>
        <FormattedHTMLMessage
          id={'project_time_entry.alert.once_delete_this_project'}
        />
      </p>
    </Alert>
  );
}
export default compose(
  withAlertStoreConnect(),
  withAlertActions,
)(ProjectTimesheetDeleteAlert);
