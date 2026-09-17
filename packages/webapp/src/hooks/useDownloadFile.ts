import {
  AxiosError,
  AxiosProgressEvent,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { useMutation } from 'react-query';
import useApiRequest from './useRequest';
import { showApiError } from '@/utils/showApiError';

interface IArgs {
  url: string;
  filename: string;
  mime?: string;
  config?: AxiosRequestConfig;
  onDownloadProgress?: (progress: number) => void;
}

export const useDownloadFile = (args: IArgs) => {
  const apiRequest = useApiRequest();

  // Доводов у запуска нет: всё, что нужно, крючок получил при создании и
  // держит в замыкании. Объявлено было `IArgs` — будто их надо передать ещё
  // раз, и **тридцать** вызовов вида `xlsxExport()` в пятнадцати отчётах
  // считались ошибкой (Д1 карты v83).
  const mutation = useMutation<AxiosResponse, AxiosError, void>(
    () =>
      apiRequest
        .get(args.url, {
          responseType: 'blob',
          // Без известного размера файла процент не посчитать: раньше сюда
          // уходило `NaN` (деление на `undefined`), теперь событие без размера
          // просто пропускается (Д13 карты v85).
          onDownloadProgress: (ev: AxiosProgressEvent) => {
            if (args.onDownloadProgress && ev.total) {
              args.onDownloadProgress(Math.round((ev.loaded * 100) / ev.total));
            }
          },
          ...args.config,
        })
        .then((res) => {
          downloadFile(res.data, args.filename, args.mime);
          return res;
        }),
    {
      // Без этого отказ сервера тонул: прогресс-тост висел, а причина
      // (например «сузьте период») не доходила (М3 карты v15).
      onError: (error: unknown) => showApiError(error),
    },
  );
  return { ...mutation };
};

export function downloadFile(
  data: BlobPart,
  filename: string,
  mime = 'application/octet-stream',
  bom?: BlobPart,
) {
  var blobData = typeof bom !== 'undefined' ? [bom, data] : [data];
  var blob = new Blob(blobData, { type: mime });

  // `msSaveBlob` есть только у Internet Explorer; из объявлений DOM его давно
  // убрали, а ветка оставлена как была.
  const navigatorWithMsSave = window.navigator as Navigator & {
    msSaveBlob?: (blob: Blob, filename: string) => boolean;
  };

  if (typeof navigatorWithMsSave.msSaveBlob !== 'undefined') {
    // IE workaround for "HTML7007: One or more blob URLs were
    // revoked by closing the blob for which they were created.
    // These URLs will no longer resolve as the data backing
    // the URL has been freed."
    navigatorWithMsSave.msSaveBlob(blob, filename);
  } else {
    var blobURL =
      window.URL && window.URL.createObjectURL
        ? window.URL.createObjectURL(blob)
        : window.webkitURL.createObjectURL(blob);
    var tempLink = document.createElement('a');
    tempLink.style.display = 'none';
    tempLink.href = blobURL;
    tempLink.setAttribute('download', filename);

    // Safari thinks _blank anchor are pop ups. We only want to set _blank
    // target if the browser does not support the HTML5 download attribute.
    // This allows you to download files in desktop safari if pop up blocking
    // is enabled.
    if (typeof tempLink.download === 'undefined') {
      tempLink.setAttribute('target', '_blank');
    }

    document.body.appendChild(tempLink);
    tempLink.click();

    // Fixes "webkit blob resource error 1"
    setTimeout(function () {
      document.body.removeChild(tempLink);
      window.URL.revokeObjectURL(blobURL);
    }, 200);
  }
}
