import { ComponentType } from 'react';
import intl from 'react-intl-universal';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { compose, saveInvoke } from '@/utils';

interface ClearingAllLinesAlertProps {
  name: string;
  /** Колбэк формы: фактическая очистка строк выполняется на вызывающей стороне. */
  onConfirm?: () => void;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: Record<string, never>;
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение очистки всех строк платежа (shadcn ConfirmDialog).
 * Механизм прежний: redux openAlert('clear-all-lines-payment-receive').
 */
function ClearingAllLinesAlertRoot({
  name,
  onConfirm,
  isOpen,
  closeAlert,
}: ClearingAllLinesAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: закрываем алерт и отдаём управление форме.
  const handleConfirm = () => {
    closeAlert(name);
    saveInvoke(onConfirm);
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('clearing_the_table_lines_will_delete_all_credits')}
      confirmLabel={intl.get('clear')}
      intent="danger"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}

// withAlertStoreConnect — легаси-HOC (без типов): mapState фактически
// необязателен, кастуем сигнатуру локально, не трогая общий модуль.
const withAlertStoreConnectLoose = withAlertStoreConnect as unknown as (
  mapState?: unknown,
) => (
  component: ComponentType<any>,
) => ComponentType<ClearingAllLinesAlertProps>;

export default compose(
  withAlertStoreConnectLoose(),
  withAlertActions,
)(ClearingAllLinesAlertRoot) as ComponentType<ClearingAllLinesAlertProps>;
