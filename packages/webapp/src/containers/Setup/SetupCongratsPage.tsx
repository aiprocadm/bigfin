// @ts-nocheck
import React from 'react';
import { Button, Intent } from '@blueprintjs/core';
import { x } from '@xstyled/emotion';
import { css } from '@emotion/css';
import { useIsDarkMode } from '@/hooks/useDarkMode';

import WorkflowIcon from './WorkflowIcon';
import { FormattedMessage as T } from '@/components';

import { withOrganizationActions } from '@/containers/Organization/withOrganizationActions';
import { compose } from '@/utils';

/**
 * Setup congrats page.
 */
function SetupCongratsPage({ setOrganizationSetupCompleted }) {
  const [isReloading, setIsReloading] = React.useState(false);
  const isDarkMode = useIsDarkMode();

  const handleBtnClick = () => {
    setIsReloading(true);
    window.location.reload();
  };

  // У новой организации включены только базовые модули (2 из 36), и раньше
  // мастер об этом молчал — четыре группы меню просто отсутствовали, а
  // ссылки на страницу включения модулей не было нигде (Р4 карты v16).
  const handleModulesBtnClick = () => {
    setIsReloading(true);
    window.location.assign('/preferences/modules');
  };

  // Мастер не спрашивает ни ИНН, ни банк — а без реквизитов счёт на оплату
  // печатается негодным. Ведём человека в секцию «Реквизиты» (К2 карты v17).
  const handleRequisitesBtnClick = () => {
    setIsReloading(true);
    window.location.assign('/preferences/general');
  };

  return (
    <x.div
      w={'500px'}
      mx="auto"
      textAlign="center"
      pt={'80px'}
    >
      <x.div>
        <WorkflowIcon width="280" height="330" />
      </x.div>

      <x.div mt={30}>
        <x.h2
          color={isDarkMode ? 'rgba(255, 255, 255, 0.85)' : '#2d2b43'}
          mb={'12px'}
        >
          <T id={'setup.congrats.title'} />
        </x.h2>

        <x.p
          fontSize={'16px'}
          opacity={0.85}
          mb={'14px'}
          color={isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined}
        >
          <T id={'setup.congrats.description'} />
        </x.p>

        <x.p
          fontSize={'14px'}
          opacity={0.75}
          mb={'14px'}
          color={isDarkMode ? 'rgba(255, 255, 255, 0.6)' : undefined}
        >
          <T id={'setup.congrats.modules_hint'} />
        </x.p>

        <x.div
          className={css`
            .bp4-button {
              height: 38px;
              padding-left: 25px;
              padding-right: 25px;
              font-size: 15px;
              margin-top: 12px;
            }
          `}
        >
          <Button
            intent={Intent.PRIMARY}
            type="submit"
            loading={isReloading}
            onClick={handleBtnClick}
          >
            <T id={'setup.congrats.go_to_dashboard'} />
          </Button>{' '}
          <Button disabled={isReloading} onClick={handleModulesBtnClick}>
            <T id={'setup.congrats.open_modules'} />
          </Button>{' '}
          <Button disabled={isReloading} onClick={handleRequisitesBtnClick}>
            <T id={'setup.congrats.fill_requisites'} />
          </Button>
        </x.div>
      </x.div>
    </x.div>
  );
}

export default compose(withOrganizationActions)(SetupCongratsPage);
