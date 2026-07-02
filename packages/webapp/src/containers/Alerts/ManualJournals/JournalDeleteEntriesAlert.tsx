import { ComponentType } from 'react';
import intl from 'react-intl-universal';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withAlertStoreConnect } from '@/containers/Alert/withAlertStoreConnect';
import { compose, saveInvoke } from '@/utils';

interface JournalDeleteEntriesAlertProps {
  name: string;
  onConfirm?: () => void;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertStoreConnectProps {
  isOpen?: boolean;
  payload?: Record<string, unknown>;
}
interface WithAlertActionsProps {
  closeAlert: (name: string) => void;
}

/**
 * Подтверждение очистки строк ручной проводки (shadcn ConfirmDialog).
 * Мутации нет: подтверждение возвращается вызывающей стороне через onConfirm.
 */
function JournalDeleteEntriesAlertRoot({
  name,
  onConfirm,
  isOpen,
  closeAlert,
}: JournalDeleteEntriesAlertProps &
  WithAlertStoreConnectProps &
  WithAlertActionsProps) {
  // Отмена: закрываем алерт по имени (redux).
  const handleCancel = () => {
    closeAlert(name);
  };

  // Подтверждение: закрываем алерт и отдаём колбэк вызывающей стороне.
  const handleConfirm = () => {
    closeAlert(name);
    saveInvoke(onConfirm);
  };

  return (
    <ConfirmDialog
      open={Boolean(isOpen)}
      title={intl.get('clear_all_lines')}
      description={intl.get(
        'clearing_the_table_lines_will_delete_all_debits_and_credits',
      )}
      confirmLabel={intl.get('clear_all_lines')}
      intent="danger"
      loading={false}
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
) => ComponentType<JournalDeleteEntriesAlertProps>;

export default compose(
  withAlertStoreConnectLoose(),
  withAlertActions,
)(JournalDeleteEntriesAlertRoot) as ComponentType<JournalDeleteEntriesAlertProps>;
