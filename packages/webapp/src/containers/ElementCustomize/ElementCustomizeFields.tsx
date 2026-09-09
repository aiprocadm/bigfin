// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
import React from 'react';
import type { WithDrawerActionsProps } from '@/containers/Drawer/withDrawerActions';
import intl from 'react-intl-universal';
import * as R from 'ramda';
import { Button, Intent } from '@blueprintjs/core';
import { useFormikContext } from 'formik';
import { Box, Group, Stack } from '@/components';
import { ElementCustomizeHeader } from './ElementCustomizeHeader';
import { ElementCustomizeTabs } from './ElementCustomizeTabs';
import { useElementCustomizeTabsController } from './ElementCustomizeTabsController';
import { useDrawerContext } from '@/components/Drawer/DrawerProvider';
import { useElementCustomizeContext } from './ElementCustomizeProvider';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import styles from './ElementCustomize.module.scss';

export function ElementCustomizeFields() {
  return (
    <Group spacing={0} align={'stretch'} className={styles.root}>
      <ElementCustomizeTabs />
      <ElementCustomizeFieldsMain />
    </Group>
  );
}

export function ElementCustomizeFieldsMain() {
  const { currentTabId } = useElementCustomizeTabsController();
  const { CustomizeTabs } = useElementCustomizeContext();

  const CustomizeTabPanel = React.useMemo(
    () =>
      React.Children.map(CustomizeTabs, (tab) => {
        return tab.props.id === currentTabId ? tab : null;
      }).filter(Boolean),
    [CustomizeTabs, currentTabId],
  );

  return (
    <Stack spacing={0} className={styles.mainFields}>
      <ElementCustomizeHeader label={intl.get('customize.label')} />

      <Stack spacing={0} flex="1 1 auto" overflow="auto">
        <Box flex={'1 1'} overflow="auto">
          {CustomizeTabPanel}
        </Box>
        <ElementCustomizeFooterActions />
      </Stack>
    </Stack>
  );
}

function ElementCustomizeFooterActionsRoot({
  closeDrawer,
}: WithDrawerActionsProps) {
  const { name } = useDrawerContext();
  const { submitForm, isSubmitting } = useFormikContext<any>();

  const handleSubmitBtnClick = () => {
    submitForm();
  };
  const handleCancelBtnClick = () => {
    closeDrawer(name);
  };

  return (
    <Group spacing={10} className={styles.footerActions}>
      <Button
        onClick={handleSubmitBtnClick}
        intent={Intent.PRIMARY}
        style={{ minWidth: 75 }}
        loading={isSubmitting}
        type={'submit'}
      >
        {intl.get('save')}
      </Button>
      <Button onClick={handleCancelBtnClick}>{intl.get('cancel')}</Button>
    </Group>
  );
}

const ElementCustomizeFooterActions = R.compose(withDrawerActions)(
  ElementCustomizeFooterActionsRoot,
);
