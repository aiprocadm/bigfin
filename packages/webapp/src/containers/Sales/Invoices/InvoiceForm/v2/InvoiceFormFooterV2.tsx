import intl from 'react-intl-universal';

import { Button } from '@/components/ui/button';

export interface InvoiceFormFooterV2Props {
  /** Идёт отправка формы (блокирует кнопки). */
  isSubmitting: boolean;
  /** Счёт уже отправлен клиенту (режим редактирования). */
  isDelivered: boolean;
  /** Сохранить черновик (без отправки клиенту). */
  onSaveDraft: () => void;
  /** Отмена — возврат назад. */
  onCancel: () => void;
}

/**
 * Панель действий формы счёта (v2), закреплена внизу.
 * По стандарту простоты — ровно одна primary-кнопка:
 * «Сохранить и отправить» (submit), рядом secondary-черновик и ghost-отмена.
 */
export function InvoiceFormFooterV2({
  isSubmitting,
  isDelivered,
  onSaveDraft,
  onCancel,
}: InvoiceFormFooterV2Props) {
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
        {!isDelivered && (
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
          {intl.get(isDelivered ? 'save' : 'save_and_deliver')}
        </Button>
      </div>
    </div>
  );
}
