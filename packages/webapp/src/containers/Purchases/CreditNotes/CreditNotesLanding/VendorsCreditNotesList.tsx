import React from 'react';

import '@/style/pages/VendorsCreditNote/List.scss';

import { DashboardPageContent } from '@/components';
import VendorsCreditNoteActionsBar from './VendorsCreditNoteActionsBar';
import { VendorsCreditNotesTableV2 } from './v2/VendorsCreditNotesTableV2';

import { withVendorsCreditNotes } from './withVendorsCreditNotes';
import { withVendorsCreditNotesActions } from './withVendorsCreditNotesActions';

import { VendorsCreditNoteListProvider } from './VendorsCreditNoteListProvider';
import { transformTableStateToQuery, compose } from '@/utils';

function VendorsCreditNotesList({
  // #withVendorsCreditNotes
  vendorsCreditNoteTableState,
  vendorsCreditNoteTableStateChanged,

  // #withVendorsCreditNotesActions
  resetVendorsCreditNoteTableState,
}: any) {
  // Resets the credit note table state once the page unmount.
  React.useEffect(
    () => () => {
      resetVendorsCreditNoteTableState();
    },
    [resetVendorsCreditNoteTableState],
  );

  return (
    <VendorsCreditNoteListProvider
      query={transformTableStateToQuery(vendorsCreditNoteTableState)}
      tableStateChanged={vendorsCreditNoteTableStateChanged}
    >
      <VendorsCreditNoteActionsBar />
      <DashboardPageContent>
        <div className="bigfin-ui">
          <VendorsCreditNotesTableV2 />
        </div>
      </DashboardPageContent>
    </VendorsCreditNoteListProvider>
  );
}

export default compose(
  withVendorsCreditNotesActions,
  withVendorsCreditNotes(
    ({ vendorsCreditNoteTableState, vendorsCreditNoteTableStateChanged }: any) => ({
      vendorsCreditNoteTableState,
      vendorsCreditNoteTableStateChanged,
    }),
  ),
)(VendorsCreditNotesList);
