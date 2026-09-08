import React from 'react';
import intl from 'react-intl-universal';
import { x } from '@xstyled/emotion';
import { css } from '@emotion/css';

import SetupOrganizationPage from './SetupOrganizationPage';
import SetupInitializingForm from './SetupInitializingForm';
import SetupCongratsPage from './SetupCongratsPage';
import { Stepper } from '@/components/Stepper';

interface SetupWizardContentProps {
  stepIndex: number;
  stepId: string;
}

const itemsClassName = css`
  padding: 40px 40px 20px;
`;

/**
 * Экраны мастера первичной настройки.
 *
 * Шага «Подписка» здесь больше нет: он открывался первым у каждого нового
 * пользователя и показывал долларовые тарифы и оплату чужого сервиса
 * (М4 карты v15). Сам экран из кода не удалён — только не показывается.
 */
export default function SetupWizardContent({
  stepIndex,
  stepId,
}: SetupWizardContentProps) {
  return (
    <x.div w="100%" overflow="auto">
      <Stepper
        active={stepIndex}
        classNames={{
          items: itemsClassName,
        }}
      >
        <Stepper.Step label={intl.get('setup.wizard.step.organization')}>
          <SetupOrganizationPage id="organization" />
        </Stepper.Step>

        <Stepper.Step label={intl.get('setup.wizard.step.initializing')}>
          <SetupInitializingForm id={'initializing'} />
        </Stepper.Step>

        <Stepper.Step label={intl.get('setup.wizard.step.congrats')}>
          <SetupCongratsPage id="congrats" />
        </Stepper.Step>
      </Stepper>
    </x.div>
  );
}
