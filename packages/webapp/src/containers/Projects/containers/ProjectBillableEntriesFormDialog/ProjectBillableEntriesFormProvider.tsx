
import React from 'react';
import { isEmpty } from 'lodash';
import { useProjectBillableEntries } from '../../hooks';
import { DialogContent } from '@/components';

const ProjectBillableEntriesFormContext = React.createContext<any>(undefined);

/**
 * Project billable entries form provider.
 * @returns
 */
function ProjectBillableEntriesFormProvider({
  // #ownProps
  dialogName,
  projectId,
  ...props
}: any) {
  // Handle fetch project billable entries.
  const { data: billableEntries, isLoading: isProjectBillableEntriesLoading } =
    useProjectBillableEntries(
      projectId,
      // Порядок доводов у крючка — (номер проекта, параметры адреса,
      // настройки запроса). Признак `enabled` стоял вторым, то есть уходил
      // **в адрес** как `?enabled=true`, а запрос выполнялся всегда — в том
      // числе с пустым номером проекта (Д13 карты v82).
      {
        // billable_type: '',
        // to_date: '',
      },
      {
        enabled: !!projectId,
      },
    );

  // Detarmines the datatable empty status.
  const isEmptyStatus = isEmpty(billableEntries);

  //state provider.
  const provider = {
    dialogName,
    billableEntries,
    projectId,
    isEmptyStatus,
  };

  return (
    <DialogContent
      name={'project-billable-entries'}
      isLoading={isProjectBillableEntriesLoading}
    >
      <ProjectBillableEntriesFormContext.Provider value={provider} {...props} />
    </DialogContent>
  );
}

const useProjectBillableEntriesFormContext = () =>
  React.useContext(ProjectBillableEntriesFormContext);

export {
  ProjectBillableEntriesFormProvider,
  useProjectBillableEntriesFormContext,
};
