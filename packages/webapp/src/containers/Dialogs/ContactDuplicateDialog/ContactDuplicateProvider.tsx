import React from 'react';
import { DialogContent } from '@/components';

const ContactDuplicateContext = React.createContext<any>(undefined);

/**
 *  contact duplicate provider.
 */
function ContactDuplicateProvider({ contactId, dialogName, ...props }: any) {
  // Provider state.
  const provider = {
    dialogName,
    contactId,
  };

  return (
    <DialogContent name={'contact-duplicate'}>
      <ContactDuplicateContext.Provider value={provider} {...props} />
    </DialogContent>
  );
}

const useContactDuplicateFromContext = () =>
  React.useContext(ContactDuplicateContext);

export { ContactDuplicateProvider, useContactDuplicateFromContext };
