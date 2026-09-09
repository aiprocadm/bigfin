
import type { ProviderProps } from '@/utils/formTypes';
import React from 'react';
import { useProjectBillableEntries } from '../../hooks';
import { DialogContent } from '@/components';

const ProjectBillableEntriesContext = React.createContext<any>(undefined);

/**
 * Project billable entries provider.
 * @returns
 */
function ProjectBillableEntriesProvider({
  projectId,
  ...props
}: ProviderProps<{ projectId?: number }>) {
  // Handle fetch project billable entries.
  const { data: billableEntries, isLoading: isProjectBillableEntriesLoading } =
    useProjectBillableEntries(
      projectId,
      // Порядок доводов у крючка — (номер проекта, параметры адреса,
      // настройки запроса). Признак `enabled` стоял вторым, то есть уходил
      // **в адрес** как `?enabled=true`, а запрос выполнялся всегда — в том
      // числе с пустым номером проекта (Д13 карты v82).
      {},
      { enabled: !!projectId },
    );

  //state provider.
  const provider = {
    projectId,
    billableEntries,
  };

  return (
    <DialogContent isLoading={isProjectBillableEntriesLoading}>
      <ProjectBillableEntriesContext.Provider value={provider} {...props} />
    </DialogContent>
  );
}

const useProjectBillableEntriesContext = () =>
  React.useContext(ProjectBillableEntriesContext);

export { ProjectBillableEntriesProvider, useProjectBillableEntriesContext };
