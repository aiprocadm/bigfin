import intl from 'react-intl-universal';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';

/**
 * Пустое состояние вкладки «Филиалы» — приглашение активировать функцию.
 */
function BranchesEmptyStatus({
  // #withDialogActions
  openDialog,
}: any) {
  // Открывает диалог активации филиалов.
  const handleActivateBranch = () => {
    openDialog('branch-activate', {});
  };

  return (
    <div className="bigfin-ui p-4">
      <EmptyState
        title={intl.get('branches.empty_status.title')}
        description={intl.get('branches.empty_status.description')}
        action={
          <Button onClick={handleActivateBranch}>
            {intl.get('branches.activate_button')}
          </Button>
        }
      />
    </div>
  );
}

export default compose(withDialogActions)(BranchesEmptyStatus);
