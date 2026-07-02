import { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Can } from '@/components';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AbilitySubject, ManualJournalAction } from '@/constants/abilityOption';
import { DRAWERS } from '@/constants/drawers';
import { withAlertActions } from '@/containers/Alert/withAlertActions';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { compose } from '@/utils';

import type { ManualJournalDetail } from './types';

interface ManualJournalHeaderV2Props {
  manualJournal: ManualJournalDetail;
  manualJournalId: number;
}

// Легаси-HOC'и (без типов) не экспортируют типы инжектируемых пропсов —
// описываем локально, не трогая общие модули.
interface WithAlertActionsProps {
  openAlert: (name: string, payload?: Record<string, unknown>) => void;
}
interface WithDrawerActionsProps {
  closeDrawer: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Шапка деталей проводки: номер + статус-пилюля («Опубликован»/«Черновик»)
 * + «Редактировать проводку» + меню «⋯» с удалением — те же действия,
 * что и в легаси actions-bar.
 */
function ManualJournalHeaderV2Root({
  manualJournal,
  manualJournalId,
  openAlert,
  closeDrawer,
}: ManualJournalHeaderV2Props &
  WithAlertActionsProps &
  WithDrawerActionsProps) {
  const history = useHistory();

  // Переход к форме правки + закрытие drawer'а (как в легаси actions-bar).
  const handleEditJournal = () => {
    history.push(`/manual-journals/${manualJournalId}/edit`);
    closeDrawer(DRAWERS.JOURNAL_DETAILS);
  };

  const handleDeleteJournal = () => {
    openAlert('journal-delete', { manualJournalId });
  };

  return (
    <DrawerHeader className="shrink-0 gap-1 border-b border-border bg-surface px-4 py-4 pr-14 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <DrawerTitle className="text-xl">
          {intl.get('manual_journal.drawer.title', {
            number: manualJournal.journal_number,
          })}
        </DrawerTitle>

        {/* Статус — как в списке проводок v2: опубликован (success) / черновик. */}
        <Badge variant={manualJournal.is_published ? 'success' : 'outline'}>
          {intl.get(manualJournal.is_published ? 'published' : 'draft')}
        </Badge>

        <span className="ml-auto flex items-center gap-2">
          <Can I={ManualJournalAction.Edit} a={AbilitySubject.ManualJournal}>
            <Button variant="secondary" size="sm" onClick={handleEditJournal}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {intl.get('edit_journal')}
            </Button>
          </Can>

          <Can I={ManualJournalAction.Delete} a={AbilitySubject.ManualJournal}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-8 sm:w-8"
                  aria-label={intl.get('more_actions')}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onClick={handleDeleteJournal}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {intl.get('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Can>
        </span>
      </div>
    </DrawerHeader>
  );
}

export const ManualJournalHeaderV2 = compose(
  withDrawerActions,
  withAlertActions,
)(ManualJournalHeaderV2Root) as ComponentType<ManualJournalHeaderV2Props>;
