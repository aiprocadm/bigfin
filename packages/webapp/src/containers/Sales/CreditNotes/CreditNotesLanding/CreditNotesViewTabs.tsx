import React from 'react';
import { Alignment, Navbar, NavbarGroup } from '@blueprintjs/core';

import { DashboardViewsTabs } from '@/components';
import { compose, transfromViewsToTabs } from '@/utils';
import { useCreditNoteListContext } from './CreditNotesListProvider';

import { withCreditNotes } from './withCreditNotes';
import { withCreditNotesActions } from './withCreditNotesActions';

/**
 * Credit Note views tabs.
 */
function CreditNotesViewTabs({
  // #withCreditNotes
  creditNoteCurrentView,

  // #withCreditNotesActions
  setCreditNotesTableState,
}: any) {
  // Credit note list context.
  const { CreditNotesView } = useCreditNoteListContext();

  const tabs = transfromViewsToTabs(CreditNotesView);

  // Handle tab change.
  const handleTabsChange = (viewSlug: any) => {
    setCreditNotesTableState({ viewSlug });
  };

  return (
    <Navbar className={'navbar--dashboard-views'}>
      <NavbarGroup align={Alignment.LEFT}>
        <DashboardViewsTabs
          currentViewSlug={creditNoteCurrentView}
          resourceName={'credit_notes'}
          tabs={tabs}
          onChange={handleTabsChange}
        />
      </NavbarGroup>
    </Navbar>
  );
}

export default compose(
  withCreditNotesActions,
  withCreditNotes(({ creditNoteTableState }: any) => ({
    creditNoteCurrentView: creditNoteTableState.viewSlug,
  })),
)(CreditNotesViewTabs);
