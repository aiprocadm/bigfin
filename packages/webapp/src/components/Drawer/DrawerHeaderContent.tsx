import React from 'react';
import intl from 'react-intl-universal';
import { FormattedMessage as T } from '@/components';
import { Classes, Icon, IconSize, H4, Button } from '@blueprintjs/core';
import type { IconName, MaybeElement } from '@blueprintjs/core';

import {
  withDrawerActions,
  WithDrawerActionsProps,
} from '@/containers/Drawer/withDrawerActions';
import { useDrawerContext } from './DrawerProvider';

import { compose } from '@/utils';
import styled from 'styled-components';

export interface DrawerHeaderContentProps {
  icon?: IconName | MaybeElement;
  title?: React.ReactNode;
  subTitle?: React.ReactNode;
}

/**
 * Drawer header content.
 *
 * Размер иконок раньше брался из `Icon.SIZE_LARGE`. В Blueprint 4 такого
 * свойства у `Icon` нет — константа переехала в `IconSize.LARGE`, а обращение
 * отдавало `undefined`: обе иконки шапки рисовались стандартными, 16 вместо
 * задуманных 20 (Д4 карты v85).
 */
function DrawerHeaderContentRoot(
  props: DrawerHeaderContentProps & WithDrawerActionsProps,
) {
  const {
    icon,
    title = <T id={'view_paper'} />,
    subTitle,
    closeDrawer,
  } = props;
  const { name } = useDrawerContext();

  if (title == null) {
    return null;
  }
  const handleClose = () => {
    closeDrawer(name);
  };

  return (
    <div className={Classes.DRAWER_HEADER}>
      <Icon icon={icon} size={IconSize.LARGE} />
      <H4>
        {title}
        <SubTitle>{subTitle}</SubTitle>
      </H4>

      <Button
        aria-label={intl.get('close')}
        className={Classes.DIALOG_CLOSE_BUTTON}
        icon={<Icon icon="small-cross" size={IconSize.LARGE} />}
        minimal={true}
        onClick={handleClose}
      />
    </div>
  );
}

export const DrawerHeaderContent: React.ComponentType<DrawerHeaderContentProps> =
  compose(withDrawerActions)(DrawerHeaderContentRoot);

/**
 * SubTitle Drawer header.
 * @returns {React.JSX}
 */
function SubTitle({ children }: { children?: React.ReactNode }) {
  if (children == null) {
    return null;
  }

  return <SubTitleHead>{children}</SubTitleHead>;
}

const SubTitleHead = styled.div`
  --x-color-text: #666;

  .bp4-dark & {
    --x-color-text: rgba(255, 255, 255, 0.6);
  }
  color: var(--x-color-text);
  font-size: 12px;
  font-weight: 400;
  line-height: 1;
  padding: 2px 0px;
  margin: 2px 0px;
`;
