import { useMutation } from 'react-query';
import useApiRequest from '../useRequest';

interface Import1CStatementValues {
  accountId: string | number;
  file: File;
  accountNumber?: string;
  currencyCode?: string;
}

/**
 * Что сервер отвечает на загрузку выписки.
 *
 * Разбивка пропущенных записей (`Import1CResult.dto` на сервере, инвариант
 * `skipped = duplicates + noDirection + unparsed`) здесь не была объявлена,
 * хотя страница импорта её читает и показывает человеку. Дописана (Д8 карты
 * v88).
 */
interface Import1CStatementResponse {
  imported: number;
  skipped: number;
  /** Запись уже была — дедуп по внешнему номеру. */
  duplicates: number;
  /** Не удалось определить приход/расход. */
  noDirection: number;
  /** Строку не распознал разборщик. */
  unparsed: number;
}

/**
 * Uploads a 1C bank statement (.txt) file to the server for a given
 * cashflow account and returns import counts.
 */
export function useImport1CStatement(props = {}) {
  const apiRequest = useApiRequest();

  return useMutation<Import1CStatementResponse, Error, Import1CStatementValues>(
    (values) => {
      const formData = new FormData();
      formData.append('file', values.file);
      if (values.accountNumber) {
        formData.append('accountNumber', values.accountNumber);
      }
      if (values.currencyCode) {
        formData.append('currencyCode', values.currencyCode);
      }
      return apiRequest
        .post(
          `cashflow-accounts/${values.accountId}/import/1c`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        )
        .then((res) => res.data);
    },
    {
      ...props,
    },
  );
}

interface TableStatementValues {
  accountId: string | number;
  file: File;
  currencyCode?: string;
}

export interface TableStatementPreview {
  total: number;
  toImport: number;
  duplicates: number;
  unparsed: number;
  columns: Record<string, string>;
  warnings: string[];
  sample: Array<{
    date: string;
    amount: number;
    payee: string | null;
    description: string | null;
  }>;
}

/** Ответы приходят в snake_case — приводим к виду, ожидаемому страницей. */
const toPreview = (raw: any): TableStatementPreview => ({
  total: raw?.total ?? 0,
  toImport: raw?.to_import ?? raw?.toImport ?? 0,
  duplicates: raw?.duplicates ?? 0,
  unparsed: raw?.unparsed ?? 0,
  columns: raw?.columns ?? {},
  warnings: raw?.warnings ?? [],
  sample: (raw?.sample ?? []).map((r: any) => ({
    date: r.date,
    amount: r.amount,
    payee: r.payee ?? null,
    description: r.description ?? null,
  })),
});

const tableFormData = (values: TableStatementValues): FormData => {
  const formData = new FormData();
  formData.append('file', values.file);
  if (values.currencyCode) formData.append('currencyCode', values.currencyCode);
  return formData;
};

/** Предпросмотр выписки таблицей (CSV/Excel): что распозналось. */
export function usePreviewTableStatement(props = {}) {
  const apiRequest = useApiRequest();

  return useMutation<TableStatementPreview, Error, TableStatementValues>(
    (values) =>
      apiRequest
        .post(
          `cashflow-accounts/${values.accountId}/import/table/preview`,
          tableFormData(values),
          { headers: { 'Content-Type': 'multipart/form-data' } },
        )
        .then((res) => toPreview(res.data?.data ?? res.data)),
    { ...props },
  );
}

/** Импорт выписки таблицей (CSV/Excel). */
export function useImportTableStatement(props = {}) {
  const apiRequest = useApiRequest();

  return useMutation<Import1CStatementResponse, Error, TableStatementValues>(
    (values) =>
      apiRequest
        .post(
          `cashflow-accounts/${values.accountId}/import/table`,
          tableFormData(values),
          { headers: { 'Content-Type': 'multipart/form-data' } },
        )
        .then((res) => res.data?.data ?? res.data),
    { ...props },
  );
}
