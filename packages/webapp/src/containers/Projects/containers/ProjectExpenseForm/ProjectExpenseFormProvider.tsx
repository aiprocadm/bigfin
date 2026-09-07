import React from 'react';
import { DialogContent } from '@/components';

const ProjectExpenseFormContext = React.createContext<any>(undefined);

/**
 * Project expense form provider.
 * @returns
 */
function ProjectExpenseFormProvider({
  //#OwnProps
  dialogName,
  expenseId,
  ...props
}: any) {
  // state provider.
  const provider = {
    dialogName,
  };

  return (
    <DialogContent>
      <ProjectExpenseFormContext.Provider value={provider} {...props} />
    </DialogContent>
  );
}

const useProjectExpenseFormContext = () =>
  React.useContext(ProjectExpenseFormContext);
export { ProjectExpenseFormProvider, useProjectExpenseFormContext };
