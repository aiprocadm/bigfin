import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';

interface ApiKeysActionsProps {
  // #withDialogActions
  openDialog: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Панель действий вкладки «API-ключи» (топбар настроек).
 * Одна primary-кнопка — «Сгенерировать API-ключ».
 */
function ApiKeysActions({ openDialog }: ApiKeysActionsProps) {
  const handleClickGenerateApiKey = useCallback(() => {
    openDialog('api-keys-generate');
  }, [openDialog]);

  return (
    <div className="bigfin-ui flex items-center">
      <Button size="sm" onClick={handleClickGenerateApiKey}>
        <Plus className="h-4 w-4" aria-hidden />
        {intl.get('api_key.generate_button')}
      </Button>
    </div>
  );
}

export default compose(withDialogActions)(ApiKeysActions);
