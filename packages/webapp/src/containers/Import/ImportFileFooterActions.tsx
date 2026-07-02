import intl from 'react-intl-universal';
import { useFormikContext } from 'formik';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import { useImportFileContext } from './ImportFileProvider';

/** Панель действий шага загрузки: «Отмена» + primary «Далее» (submit). */
export function ImportFileUploadFooterActions() {
  const { isSubmitting } = useFormikContext();
  const { onCancelClick } = useImportFileContext();

  const handleCancelBtnClick = () => {
    onCancelClick?.();
  };

  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-surface px-4 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={handleCancelBtnClick}
          disabled={isSubmitting}
        >
          {intl.get('cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner size="sm" />}
          {intl.get('next')}
        </Button>
      </div>
    </div>
  );
}
