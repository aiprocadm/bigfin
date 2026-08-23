import { css } from '@emotion/css';
import { Stack } from '@/components';
import { CreditNoteSendMailPreviewHeader } from './CreditNoteSendMailPreviewHeader';
import { CreditNoteMailPreviewConnected } from './withCreditNoteMailPreviewProps';

const creditNotePreviewCss = css`
  margin: 0 auto;
  border-radius: 5px !important;
  transform: scale(0.9);
  transform-origin: top;
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.05) !important;
`;

export function CreditNoteSendMailPreview() {
  return (
    <Stack spacing={0}>
      <CreditNoteSendMailPreviewHeader />

      <Stack px={4} py={6}>
        <CreditNoteMailPreviewConnected className={creditNotePreviewCss} />
      </Stack>
    </Stack>
  );
}
