import React from 'react';
import { DialogContent } from '@/components';
import {
  useEstimateSMSDetail,
  useCreateNotifyEstimateBySMS,
} from '@/hooks/query';

const NotifyEstimateViaSMSContext = React.createContext<any>(undefined);

function NotifyEstimateViaSMSFormProvider({
  estimateId,
  dialogName,
  ...props
}: any) {
  const { data: estimateSMSDetail, isLoading: isEstimateSMSDetailLoading } =
    useEstimateSMSDetail(estimateId, {
      enabled: !!estimateId,
    });

  // Create notfiy estimate by sms mutations.
  const { mutateAsync: createNotifyEstimateBySMSMutate } =
    useCreateNotifyEstimateBySMS();

  // State provider.
  const provider = {
    estimateId,
    dialogName,
    estimateSMSDetail,
    createNotifyEstimateBySMSMutate,
  };

  return (
    <DialogContent isLoading={isEstimateSMSDetailLoading}>
      <NotifyEstimateViaSMSContext.Provider value={provider} {...props} />
    </DialogContent>
  );
}

const useEstimateViaSMSContext = () =>
  React.useContext(NotifyEstimateViaSMSContext);

export { NotifyEstimateViaSMSFormProvider, useEstimateViaSMSContext };
