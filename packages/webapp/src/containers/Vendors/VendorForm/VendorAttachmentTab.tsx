import React from 'react';
import { Dragzone, FormattedMessage as T } from '@/components';

/**
 * Vendor Attachment Tab.
 */
export function VendorAttachmentTab() {
  return (
    <div>
      <Dragzone
        initialFiles={[]}
        hint={<T id={'attachments_maximum'} />}
      />
    </div>
  );
}
