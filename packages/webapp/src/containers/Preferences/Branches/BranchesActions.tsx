import intl from 'react-intl-universal';
import { Plus } from 'lucide-react';

import { Features } from '@/constants';
import { FeatureCan } from '@/components';
import { Button } from '@/components/ui/button';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { compose } from '@/utils';

/**
 * Тулбар вкладки «Филиалы»: одна primary-кнопка добавления.
 */
function BranchesActions({
  // #withDialogActions
  openDialog,
}: any) {
  const handleClickNewBranch = () => {
    openDialog('branch-form');
  };

  return (
    <div className="bigfin-ui flex items-center">
      <FeatureCan feature={Features.Branches}>
        <Button size="sm" onClick={handleClickNewBranch}>
          <Plus className="h-4 w-4" aria-hidden />
          {intl.get('branches.label.new_branch')}
        </Button>
      </FeatureCan>
    </div>
  );
}

export default compose(withDialogActions)(BranchesActions);
