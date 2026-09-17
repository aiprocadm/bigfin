import React from 'react';
import { ProgressBar, Intent } from '@blueprintjs/core';
import { x } from '@xstyled/emotion';
import { css } from '@emotion/css';
import { useIsDarkMode } from '@/hooks/useDarkMode';

import { useJob, useCurrentOrganization } from '@/hooks/query';
import { FormattedMessage as T } from '@/components';

import { withOrganizationActions } from '@/containers/Organization/withOrganizationActions';
import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';
import { withOrganization } from '../Organization/withOrganization';
import { compose } from '@/utils';

/**
 * Setup initializing step form.
 */
function SetupInitializingForm({
  setOrganizationSetupCompleted,
  organization,
}: {
  setOrganizationSetupCompleted: (completed: boolean) => void;
  organization: any;
}) {
  const { refetch, isSuccess } = useCurrentOrganization({ enabled: false });

  // Job done state.
  const [isJobDone, setIsJobDone] = React.useState(false);

  const {
    data: { isRunning, isWaiting, isFailed, isCompleted },
    isFetching: isJobFetching,
  } = useJob(organization?.build_job_id, {
    refetchInterval: 2000,
    enabled: !!organization?.build_job_id,
  });

  React.useEffect(() => {
    if (isCompleted) {
      refetch();
      setIsJobDone(true);
    }
  }, [refetch, isCompleted, setOrganizationSetupCompleted]);

  React.useEffect(() => {
    if (isSuccess && isJobDone) {
      setOrganizationSetupCompleted(true);
      setIsJobDone(false);
    }
  }, [setOrganizationSetupCompleted, isJobDone, isSuccess]);

  return (
    <x.div w="95%" mx="auto" pt="16%">
      {isFailed ? (
        <SetupInitializingFailed />
      ) : isRunning || isWaiting || isJobFetching ? (
        <SetupInitializingRunning />
      ) : isCompleted ? (
        <SetupInitializingCompleted />
      ) : (
        <SetupInitializingFailed />
      )}
    </x.div>
  );
}

/**
 * Тип указан явно. Сборка из двух и более обёрток теряет знание о том, что
 * на выходе компонент, и место применения получает «ничто» — отсюда «нельзя
 * использовать как компонент». Обёртки сами подставляют всё, что нужно, поэтому
 * снаружи компонент вызывается без свойств (Д9 карты v75).
 */
const ConnectedSetupInitializingForm: React.FC<{ id?: string }> = compose(
  withOrganizationActions,
  withCurrentOrganization(({ organizationTenantId }: any) => ({
    organizationId: organizationTenantId,
  })),
  withOrganization(({ organization }) => ({ organization })),
)(SetupInitializingForm);

export default ConnectedSetupInitializingForm;

/**
 * State initializing failed state.
 */
function SetupInitializingFailed() {
  const isDarkMode = useIsDarkMode();

  return (
    <x.div>
      <x.div textAlign="center" mt={35}>
        <x.h1
          fontSize={'22px'}
          fontWeight={500}
          color={isDarkMode ? 'rgba(255, 255, 255, 0.75)' : '#454c59'}
          mt={0}
          mb={'14px'}
        >
          <T id={'setup.initializing.something_went_wrong'} />
        </x.h1>
        <x.p
          w="70%"
          mx="auto"
          color={isDarkMode ? 'rgba(255, 255, 255, 0.7)' : '#2e4266'}
        >
          <T id={'setup.initializing.please_refresh_the_page'} />
        </x.p>
      </x.div>
    </x.div>
  );
}

/**
 * Setup initializing running state.
 */
function SetupInitializingRunning() {
  const isDarkMode = useIsDarkMode();

  const progressBarStyles = css`
    .bp4-progress-bar {
      border-radius: 40px;
      display: block;
      height: 6px;
      overflow: hidden;
      position: relative;
      width: 80%;
      margin: 0 auto;

      .bp4-progress-meter {
        background-color: #809cb3;
      }
    }
  `;

  return (
    <x.div>
      <x.div className={progressBarStyles}>
        {/*
          Полоса без `value` — это и есть «идёт, срок неизвестен»: в коде
          библиотеки `value == null` и отсутствие свойства — одна и та же
          ветка (Д20 карты v88).
        */}
        <ProgressBar intent={Intent.NONE} />
      </x.div>

      <x.div textAlign="center" mt={35}>
        <x.h1
          fontSize={'22px'}
          fontWeight={500}
          color={isDarkMode ? 'rgba(255, 255, 255, 0.85)' : '#454c59'}
          mt={0}
          mb={'14px'}
        >
          <T id={'setup.initializing.title'} />
        </x.h1>
        <x.p
          w="70%"
          mx="auto"
          color={isDarkMode ? 'rgba(255, 255, 255, 0.7)' : '#2e4266'}
        >
          <T id={'setup.initializing.description'} />
        </x.p>
      </x.div>
    </x.div>
  );
}

/**
 * Setup initializing completed state.
 */
function SetupInitializingCompleted() {
  const isDarkMode = useIsDarkMode();

  return (
    <x.div>
      <x.div textAlign="center" mt={35}>
        <x.h1
          fontSize={'22px'}
          fontWeight={600}
          color={isDarkMode ? 'rgba(255, 255, 255, 0.85)' : '#454c59'}
          mt={0}
          mb={'14px'}
        >
          <T id={'setup.initializing.waiting_to_redirect'} />
        </x.h1>
        <x.p
          w="70%"
          mx="auto"
          color={isDarkMode ? 'rgba(255, 255, 255, 0.7)' : '#2e4266'}
        >
          <T
            id={'setup.initializing.refresh_the_page_if_redirect_not_worked'}
          />
        </x.p>
      </x.div>
    </x.div>
  );
}
