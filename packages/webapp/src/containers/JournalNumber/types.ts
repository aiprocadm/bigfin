import type { FormikHelpers } from 'formik';

/**
 * Значения формы номера документа (`ReferenceNumberForm`). Одна форма служит
 * девяти окнам «Номер …» — счёт, смета, чек, кредит-нота, журнал и другие, —
 * поэтому вид описан здесь один раз, а не в каждом окне заново.
 *
 * `type`, а не `interface`: окна отдают значения наружу как
 * `Record<string, unknown>`, а интерфейс без индекса туда не подходит.
 */
export type ReferenceNumberFormValues = {
  /** 'auto' — номер растёт сам, 'manual' — вручную, 'manual-transaction' — вручную только в этом документе. */
  incrementMode: string;
  numberPrefix: string;
  nextNumber: string | number;
  onceManualNumber: string;
  /** Готовый номер, форма досчитывает его при отправке. */
  transactionNumber?: string;
};

export type ReferenceNumberSubmitHandler = (
  values: ReferenceNumberFormValues,
  helpers: FormikHelpers<ReferenceNumberFormValues>,
) => void;

/** Настройки нумерации из хранилища — то, что окну подставляет `withSettings`. */
export type NumberSettingsProps = {
  nextNumber?: string | number;
  numberPrefix?: string;
  autoIncrement?: boolean;
};

/**
 * Свойства содержимого окна «Номер …»: от самого окна (`initialValues`,
 * `onConfirm`) и от обёрток (`withSettings`, `withDialogActions`).
 *
 * `onConfirm` обязателен: каждое из девяти окон передаёт его всегда — своим
 * обработчиком поверх `saveInvoke`, который сам переживает отсутствие
 * внешнего обработчика.
 */
export type NumberDialogContentProps = NumberSettingsProps & {
  initialValues?: Record<string, unknown>;
  onConfirm: (values: ReferenceNumberFormValues) => void;
  closeDialog: (name: string, payload?: Record<string, unknown>) => void;
};

/** Кусок настроек группы, из которого окно берёт нумерацию. */
export type NumberSettingsGroup = NumberSettingsProps | undefined;
