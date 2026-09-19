import React, { createContext, useContext } from 'react';
import { Spinner } from '@blueprintjs/core';
import { useDrawerContext } from '@/components/Drawer/DrawerProvider';
import {
  GetCreditNoteMailStateResponse,
  useCreditNoteMailState,
} from '@/hooks/query';

interface CreditNoteSendMailBootValues {
  creditNoteId: number;

  /**
   * Пока письмо не загружено, его НЕТ — и это `undefined`, а не `null`.
   * Разница не косметическая: `null` здесь читался бы как «загрузили и
   * ничего не нашли», а мы ещё даже не спрашивали.
   */
  creditNoteMailState: GetCreditNoteMailStateResponse | null | undefined;
  isCreditNoteMailStateLoading: boolean;
}
interface CreditNoteSendMailBootProps {
  children: React.ReactNode;
}

const CreditNoteSendMailContentBootContext =
  createContext<CreditNoteSendMailBootValues>(
    {} as CreditNoteSendMailBootValues,
  );

export const CreditNoteSendMailBoot = ({
  children,
}: CreditNoteSendMailBootProps) => {
  const {
    payload: { creditNoteId },
  } = useDrawerContext();

  // Настройки письма кредит-ноты.
  const { data: creditNoteMailState, isLoading: isCreditNoteMailStateLoading } =
    useCreditNoteMailState(creditNoteId);

  if (isCreditNoteMailStateLoading) {
    return <Spinner size={20} />;
  }
  const value = {
    creditNoteId,
    creditNoteMailState,
    isCreditNoteMailStateLoading,
  };

  return (
    <CreditNoteSendMailContentBootContext.Provider value={value}>
      {children}
    </CreditNoteSendMailContentBootContext.Provider>
  );
};
CreditNoteSendMailBoot.displayName = 'CreditNoteSendMailBoot';

export const useCreditNoteSendMailBoot = () => {
  return useContext<CreditNoteSendMailBootValues>(
    CreditNoteSendMailContentBootContext,
  );
};
