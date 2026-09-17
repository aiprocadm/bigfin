import React from 'react';
import intl from 'react-intl-universal';
import { Intent, Alert } from '@blueprintjs/core';
import { AppToaster } from '@/components';

import {
  withAlertStoreConnect,
  AlertReduxProps,
} from '@/containers/Alert/withAlertStoreConnect';
import {
  withAlertActions,
  WithAlertActionsProps,
} from '@/containers/Alert/withAlertActions';
import { useResumeMainSubscription } from '@/hooks/query/subscription';
import { compose } from '@/utils';
import { showApiError } from '@/utils/showApiError';

type ResumeMainSubscriptionAlertProps = AlertReduxProps<{}> &
  WithAlertActionsProps;

/**
 * Предупреждение «возобновить подписку организации».
 *
 * Модуль подписок законсервирован (решение 27, карты v18 и v86), но код его
 * жив и обязан говорить правду: отказ сервера раньше глотался молча, вопрос
 * был английским прямо в разметке, а абзац лежал внутри абзаца
 * (Д5 карты v87).
 */
function ResumeMainSubscriptionAlert({
  name,

  // #withAlertStoreConnect
  isOpen,

  // #withAlertActions
  closeAlert,
}: ResumeMainSubscriptionAlertProps) {
  const { mutateAsync: resumeSubscription, isLoading } =
    useResumeMainSubscription();

  // Handle cancel.
  const handleCancel = () => {
    closeAlert(name);
  };
  // Handle confirm.
  const handleConfirm = () => {
    resumeSubscription()
      .then(() => {
        AppToaster.show({
          message: intl.get('subscription.alert.resume_success'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(showApiError)
      .finally(() => {
        closeAlert(name);
      });
  };

  return (
    <Alert
      cancelButtonText={intl.get('cancel')}
      confirmButtonText={intl.get('subscription.alert.resume_button')}
      intent={Intent.DANGER}
      isOpen={isOpen}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
      loading={isLoading}
    >
      <p>
        <strong>{intl.get('subscription.alert.resume_description')}</strong>
      </p>

      <p>{intl.get('subscription.alert.resume_confirm')}</p>
    </Alert>
  );
}

export default compose(
  withAlertStoreConnect(),
  withAlertActions,
)(ResumeMainSubscriptionAlert);
