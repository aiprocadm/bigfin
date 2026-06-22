// @ts-nocheck
import { useMutation } from 'react-query';
import useApiRequest from '../useRequest';

interface Import1CStatementValues {
  accountId: string | number;
  file: File;
  accountNumber?: string;
  currencyCode?: string;
}

interface Import1CStatementResponse {
  imported: number;
  skipped: number;
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
