import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import type { FileRejection } from 'react-dropzone-esm';
import { AppToaster } from '@/components/AppToaster';

/** Maps react-dropzone rejection codes to translation keys. */
const REJECT_MESSAGE_KEY: Record<string, string> = {
  'file-too-large': 'dropzone.reject.file_too_large',
  'file-invalid-type': 'dropzone.reject.file_invalid_type',
};

/**
 * Shows a user-facing error toast when a dropped file is rejected
 * (too large, unsupported format, ...). Without it the rejection was silent —
 * the user got no feedback about why the file was not accepted.
 */
export function showDropzoneRejectToast(fileRejections: FileRejection[]): void {
  const code = fileRejections?.[0]?.errors?.[0]?.code ?? '';
  const messageKey = REJECT_MESSAGE_KEY[code] ?? 'dropzone.reject.generic';

  AppToaster.show({
    message: intl.get(messageKey),
    intent: Intent.DANGER,
  });
}
