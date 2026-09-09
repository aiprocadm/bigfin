import { useMutation } from 'react-query';
import useApiRequest from '../useRequest';
import { transformToCamelCase } from '@/utils';

interface UploadAttachmentResponse {
  createdAt: string;
  id: number;
  key: string;
  mimeType: string;
  originName: string;
  size: number;
}

/**
 * Uploads the given attachments.
 */
export function useUploadAttachments(props?: any) {
  const apiRequest = useApiRequest();

  // Вид довода назван: без него запуск считается «ничего не принимает», и
  // вызов с телом запроса — ошибка (Д10 карты v84).
  return useMutation<UploadAttachmentResponse, Error, FormData>(
    (values) =>
      apiRequest
        .post('attachments', values)
        .then((res) => transformToCamelCase(res.data?.data)),
    props,
  );
}

/**
 * Deletes the given attachment key.
 */
export function useDeleteAttachment(props?: any) {
  const apiRequest = useApiRequest();

  return useMutation(
    (key: string) => apiRequest.delete(`attachments/${key}`),
    props,
  );
}

/**
 * Uploads the given attachments.
 */
export function useGetPresignedUrlAttachment(props?: any) {
  const apiRequest = useApiRequest();

  return useMutation(
    (key: string) =>
      apiRequest
        .get(`attachments/${key}/presigned-url`)
        .then((res) => res.data),
    props,
  );
}
