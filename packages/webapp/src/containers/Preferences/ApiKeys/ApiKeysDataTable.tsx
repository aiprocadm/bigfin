import { useCallback, useState } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { AppToaster } from '@/components';
import { useApiKeys, useRevokeApiKey } from '@/hooks/query';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';

import { useApiKeysTableColumns, type ApiKeyRow } from './components';

const getApiKeyRowId = (row: ApiKeyRow) => String(row.id);

// Легаси-хуки без типов — кастуем локально.
const useApiKeysTyped = useApiKeys as unknown as () => {
  data: ApiKeyRow[] | undefined;
  isLoading: boolean;
};
const useRevokeApiKeyTyped = useRevokeApiKey as unknown as () => {
  mutateAsync: (id: number) => Promise<unknown>;
  isLoading: boolean;
};

/**
 * Таблица API-ключей (новый DataTable).
 */
function ApiKeysDataTable({
  // #withDialogActions
  openDialog,
}: any) {
  const { data: apiKeys, isLoading } = useApiKeysTyped();
  const { mutateAsync: revokeApiKey, isLoading: isRevoking } =
    useRevokeApiKeyTyped();

  // Ключ, ожидающий подтверждения отзыва (null — диалог закрыт).
  const [revokeCandidate, setRevokeCandidate] = useState<ApiKeyRow | null>(
    null,
  );

  // Клик «Отозвать» в строке: открываем диалог подтверждения.
  const handleRevokeApiKey = useCallback((apiKey: ApiKeyRow) => {
    setRevokeCandidate(apiKey);
  }, []);

  // Отмена подтверждения: закрываем диалог.
  const handleRevokeCancel = useCallback(() => {
    setRevokeCandidate(null);
  }, []);

  // Подтверждение: отзываем ключ, показываем тост, закрываем диалог.
  const handleRevokeConfirm = useCallback(() => {
    if (!revokeCandidate) {
      return;
    }
    revokeApiKey(revokeCandidate.id)
      .then(() => {
        AppToaster.show({
          message: intl.get('api_key.revoke_success'),
          intent: Intent.SUCCESS,
        });
      })
      .catch(() => {
        AppToaster.show({
          message: intl.get('something_went_wrong'),
          intent: Intent.DANGER,
        });
      })
      .finally(() => {
        setRevokeCandidate(null);
      });
  }, [revokeApiKey, revokeCandidate]);

  // Создание нового ключа из пустого состояния.
  const handleGenerateApiKey = useCallback(() => {
    openDialog('api-keys-generate');
  }, [openDialog]);

  const columns = useApiKeysTableColumns({
    onRevoke: handleRevokeApiKey,
  });

  return (
    <div className="bigfin-ui p-4">
      <DataTable
        columns={columns}
        data={apiKeys ?? []}
        getRowId={getApiKeyRowId}
        loading={isLoading}
        emptyState={
          <EmptyState
            title={intl.get('api_key.empty_status.title')}
            description={intl.get('api_key.empty_status.description')}
            action={
              <Button onClick={handleGenerateApiKey}>
                {intl.get('api_key.generate_button')}
              </Button>
            }
          />
        }
      />

      <ConfirmDialog
        open={revokeCandidate != null}
        title={intl.get('api_key.revoke_confirm.title')}
        description={intl.get('api_key.revoke_confirm.description')}
        confirmLabel={intl.get('api_key.revoke')}
        intent="danger"
        loading={isRevoking}
        onConfirm={handleRevokeConfirm}
        onCancel={handleRevokeCancel}
      />
    </div>
  );
}

export default compose(withDialogActions)(ApiKeysDataTable);
