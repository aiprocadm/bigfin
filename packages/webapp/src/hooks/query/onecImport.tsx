// © 2026 Bigfin
import { useMutation, UseMutationOptions } from 'react-query';
import useApiRequest from '../useRequest';

export interface OnecCounters {
  created: number;
  updated: number;
  skipped: number;
}

export interface OnecPreviewCounters {
  toCreate: number;
  toUpdate: number;
  skipped: number;
}

export interface OnecPreviewReport {
  items: OnecPreviewCounters;
  contacts: OnecPreviewCounters;
}

export interface OnecImportReport {
  items: OnecCounters;
  contacts: OnecCounters;
}

// useRequest — легаси-JS с @ts-nocheck: сужаем форму клиента на месте.
type ApiClient = {
  post: (url: string, data?: unknown, config?: unknown) => Promise<any>;
};
const useTypedApiRequest = () => useApiRequest() as unknown as ApiClient;

// Сервер сериализует ответы в snake_case (глобальный SerializeInterceptor).
const toPreview = (res: any): OnecPreviewReport => {
  const d = res?.data?.data ?? res?.data ?? res;
  const part = (p: any): OnecPreviewCounters => ({
    toCreate: p?.to_create ?? p?.toCreate ?? 0,
    toUpdate: p?.to_update ?? p?.toUpdate ?? 0,
    skipped: p?.skipped ?? 0,
  });
  return { items: part(d?.items), contacts: part(d?.contacts) };
};

const toReport = (res: any): OnecImportReport => {
  const d = res?.data?.data ?? res?.data ?? res;
  const part = (p: any): OnecCounters => ({
    created: p?.created ?? 0,
    updated: p?.updated ?? 0,
    skipped: p?.skipped ?? 0,
  });
  return { items: part(d?.items), contacts: part(d?.contacts) };
};

const asFormData = (file: File): FormData => {
  const form = new FormData();
  form.append('file', file);
  return form;
};

/** Предпросмотр импорта: что создастся и обновится (ничего не пишет). */
export function useOnecImportPreview(
  props?: UseMutationOptions<OnecPreviewReport, any, File>,
) {
  const api = useTypedApiRequest();
  return useMutation<OnecPreviewReport, any, File>(
    (file) => api.post('onec-import/preview', asFormData(file)).then(toPreview),
    props as any,
  );
}

/** Импорт справочников CommerceML. */
export function useOnecImport(
  props?: UseMutationOptions<OnecImportReport, any, File>,
) {
  const api = useTypedApiRequest();
  return useMutation<OnecImportReport, any, File>(
    (file) => api.post('onec-import', asFormData(file)).then(toReport),
    props as any,
  );
}
