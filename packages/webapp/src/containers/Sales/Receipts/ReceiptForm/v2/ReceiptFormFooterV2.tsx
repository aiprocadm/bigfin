import intl from 'react-intl-universal';

import { Button } from '@/components/ui/button';

export interface ReceiptFormFooterV2Props {
  /** Идёт отправка формы (блокирует кнопки). */
  isSubmitting: boolean;
  /** Чек уже закрыт (режим редактирования). */
  isClosed: boolean;
  /** Сохранить черновик (без закрытия чека). */
  onSaveDraft: () => void;
  /** Отмена — возврат назад. */
  onCancel: () => void;
}

/**
 * Панель действий формы чека (v2), закреплена внизу.
 * По стандарту простоты — ровно одна primary-кнопка:
 * «Сохранить и закрыть» (submit), рядом secondary-черновик и ghost-отмена.
 */
export function ReceiptFormFooterV2({
  isSubmitting,
  isClosed,
  onSaveDraft,
  onCancel,
}: ReceiptFormFooterV2Props) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-surface px-4 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {intl.get('cancel')}
        </Button>
        {!isClosed && (
          <Button
            type="button"
            variant="secondary"
            onClick={onSaveDraft}
            disabled={isSubmitting}
          >
            {intl.get('save_as_draft')}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {intl.get(isClosed ? 'save' : 'save_close')}
        </Button>
      </div>
    </div>
  );
}
