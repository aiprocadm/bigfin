import { useCallback } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';

interface UsersActionsProps {
  // #withDialogActions
  openDialog: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Панель действий вкладки «Пользователи» (топбар настроек).
 * Одна primary-кнопка — «Пригласить пользователя»; остальное — ghost.
 */
function UsersActions({ openDialog }: UsersActionsProps) {
  const history = useHistory();

  const handleClickInviteUser = useCallback(() => {
    openDialog('invite-user');
  }, [openDialog]);

  const handleClickNewRole = useCallback(() => {
    history.push('/preferences/roles');
  }, [history]);

  return (
    <div className="bigfin-ui flex items-center gap-2">
      <Button size="sm" onClick={handleClickInviteUser}>
        <Plus className="h-4 w-4" aria-hidden />
        {intl.get('invite_user')}
      </Button>
      <Button size="sm" variant="ghost" onClick={handleClickNewRole}>
        {intl.get('new_role')}
      </Button>
    </div>
  );
}

export default compose(withDialogActions)(UsersActions);
