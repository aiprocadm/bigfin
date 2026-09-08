import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Dragzone, FormattedMessage as T } from '@/components';

function CustomerAttachmentTabs() {
  return (
    <div>
      <Dragzone
        initialFiles={[]}
        hint={<T id={'attachments_maximum'} />}
      />
    </div>
  );
}

export default CustomerAttachmentTabs;
