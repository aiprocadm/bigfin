import { downloadFile } from '@/hooks/useDownloadFile';
import useApiRequest from '@/hooks/useRequest';
import { AxiosError, AxiosResponse } from 'axios';
import { useMutation, UseMutationOptions } from 'react-query';
import { asyncToastProgress } from '@/utils/async-toast-progress';
import { showApiError } from '@/utils/showApiError';

interface ResourceExportValues {
  resource: string;
  format?: string;
}

/**
 * Initiates a download of the balance sheet in XLSX format.
 * @param {Object} query - The query parameters for the request.
 * @param {Object} args - Additional configurations for the download.
 * @returns {Function} A function to trigger the file download.
 *
 * Настройки мутации (`onMutate` и прочее) раньше уходили ТРЕТЬИМ доводом в
 * `apiRequest.get`, у которого их два, — то есть в никуда; `useMutation` их
 * не видел. Единственное место вызова передавало пустой `onMutate`, поэтому
 * поведение не менялось (Д3 карты v87).
 */
export const useResourceExportPdf = (
  props?: UseMutationOptions<AxiosResponse, AxiosError, ResourceExportValues>,
) => {
  const apiRequest = useApiRequest();

  return useMutation<AxiosResponse, AxiosError, ResourceExportValues>(
    (data) =>
      apiRequest.get('/export', {
        responseType: 'blob',
        headers: {
          accept: 'application/pdf',
        },
        params: {
          resource: data.resource,
          format: data.format,
        },
      }),
    props,
  );
};

export const useDownloadExportPdf = () => {
  const { startProgress, stopProgress } = asyncToastProgress();

  const resourceExportPdfMutation = useResourceExportPdf({
    onMutate: () => {},
  });
  const { mutateAsync, isLoading: isExportPdfLoading } =
    resourceExportPdfMutation;

  const downloadAsync = (values: ResourceExportValues) => {
    if (!isExportPdfLoading) {
      startProgress();
      // .finally гарантирует остановку прогресс-индикатора и при ошибке —
      // иначе таймер прогресса оставался висеть после неудачного экспорта.
      return mutateAsync(values)
        .then((res) => {
          downloadFile(res.data, `${values.resource}.pdf`);
          return res;
        })
        .catch((error) => {
          // Без этого отказ сервера уходил в пустоту: ни сообщения, ни следа
          // (М3 срез 4 карты v15).
          showApiError(error);
        })
        .finally(() => {
          stopProgress();
        });
    }
  };
  return {
    ...resourceExportPdfMutation,
    downloadAsync,
  };
};
