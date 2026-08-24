import { Stack } from '@/components';
import { CreditNoteSendMailPreviewHeader } from './CreditNoteSendMailPreviewHeader';
import { useDrawerContext } from '@/components/Drawer/DrawerProvider';
import { useGetCreditNoteHtml } from '@/hooks/query';
import { Spinner } from '@blueprintjs/core';
import { SendMailViewPreviewPdfIframe } from '../../Estimates/SendMailViewDrawer/SendMailViewPreviewPdfIframe';

export function CreditNoteSendMailPdfPreview() {
  return (
    <Stack spacing={0}>
      <CreditNoteSendMailPreviewHeader />

      <Stack px={4} py={6}>
        <CreditNoteSendPdfPreviewIframe />
      </Stack>
    </Stack>
  );
}

function CreditNoteSendPdfPreviewIframe() {
  const { payload } = useDrawerContext();
  const { data, isLoading } = useGetCreditNoteHtml(payload?.creditNoteId);

  // Крутилка — пока грузится и данных ещё нет (у чека условие было
  // перевёрнуто и крутилка не показывалась никогда, Р3б v18).
  if (isLoading && !data) {
    return <Spinner size={20} />;
  }
  const iframeSrcDoc = data?.htmlContent;

  return <SendMailViewPreviewPdfIframe srcDoc={iframeSrcDoc} />;
}
