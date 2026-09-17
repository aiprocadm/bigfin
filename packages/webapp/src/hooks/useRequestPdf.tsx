import React from 'react';
import {
  AxiosHeaders,
  AxiosRequestConfig,
  AxiosResponse,
  RawAxiosHeaders,
} from 'axios';
import useApiRequest from './useRequest';
import { normalizeApiPath } from '../utils';
import { showApiError } from '@/utils/showApiError';

export const useRequestPdf = (httpProps: AxiosRequestConfig) => {
  const apiRequest = useApiRequest();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [pdfUrl, setPdfUrl] = React.useState('');
  const [response, setResponse] = React.useState<AxiosResponse | null>(null);
  const [filename, setFilename] = React.useState<string>('');

  React.useEffect(() => {
    let objectUrl = '';
    let cancelled = false;
    setIsLoading(true);
    apiRequest
      .http({
        headers: { accept: 'application/pdf' },
        responseType: 'blob',
        ...httpProps,
        url: `/api/${normalizeApiPath(httpProps?.url)}`,
      })
      .then((response) => {
        // Create a Blob from the PDF Stream.
        const file = new Blob([response.data], { type: 'application/pdf' });

        // Build a URL from the file
        const fileURL = URL.createObjectURL(file);
        objectUrl = fileURL;

        // Компонент размонтировали до завершения запроса — сразу освобождаем
        // blob-URL и не трогаем состояние размонтированного компонента.
        if (cancelled) {
          URL.revokeObjectURL(fileURL);
          return;
        }

        // Extract the filename from the Content-Disposition header.
        // Заголовки ответа у axios бывают и «сырым» объектом, и `AxiosHeaders`;
        // `.get` есть только у второго. `AxiosHeaders.from` приводит к нему
        // (и не копирует, если это уже он). Приведение к `RawAxiosHeaders`
        // снимает лишь `Partial` из объявления ответа.
        const contentDisposition = String(
          AxiosHeaders.from(response.headers as RawAxiosHeaders).get(
            'Content-Disposition',
          ) ?? '',
        );
        let _filename = 'default.pdf'; // Default filename if not provided by server

        if (contentDisposition && contentDisposition.includes('filename=')) {
          const matches = contentDisposition.match(/filename="(.+)"/);
          if (matches && matches[1]) {
            _filename = matches[1];
          }
        }
        setPdfUrl(fileURL);
        setIsLoading(false);
        setIsLoaded(true);
        setResponse(response);
        setFilename(_filename);
      })
      .catch((error) => {
        // Раньше отказ сервера оставлял предпросмотр крутиться вечно:
        // ошибка не ловилась вовсе (М3 карты v15).
        if (!cancelled) {
          setIsLoading(false);
        }
        showApiError(error);
      });

    // Освобождаем blob-URL при размонтировании, иначе память браузера течёт
    // на каждом предпросмотре PDF.
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);

  return {
    isLoading,
    isLoaded,
    pdfUrl,
    response,
    filename
  };
};
