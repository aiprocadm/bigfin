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

const asFormData = (file: File): FormData => {
  const form = new FormData();
  form.append('file', file);
  return form;
};

/** Предпросмотр импорта: что создастся и обновится (ничего не пишет). */
export function useOnecImportPreview(
  props?: UseMutationOptions<any, any, File>,
) {
  const api = useTypedApiRequest();
  return useMutation<any, any, File>(
    (file) => api.post('onec-import/preview', asFormData(file)),
    props,
  );
}

/** Импорт справочников CommerceML. */
export function useOnecImport(props?: UseMutationOptions<any, any, File>) {
  const api = useTypedApiRequest();
  return useMutation<any, any, File>(
    (file) => api.post('onec-import', asFormData(file)),
    props,
  );
}
