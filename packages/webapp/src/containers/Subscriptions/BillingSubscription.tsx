import * as R from 'ramda';
import clsx from 'classnames';
import { includes } from 'lodash';
import { Box, Group, Stack } from '@/components';
import { Button, Card, Classes, Intent, Text } from '@blueprintjs/core';
import {
  withAlertActions,
  WithAlertActionsProps,
} from '../Alert/withAlertActions';
import styles from './BillingSubscription.module.scss';
import {
  withDrawerActions,
  WithDrawerActionsProps,
} from '../Drawer/withDrawerActions';
import { DRAWERS } from '@/constants/drawers';
import { useBillingPageBoot } from './BillingPageBoot';
import { getSubscriptionStatusText } from './_utils';
import { compose } from '@/utils';
import intl from 'react-intl-universal';

function SubscriptionRoot({
  openAlert,
  openDrawer,
}: WithAlertActionsProps & WithDrawerActionsProps) {
  const { mainSubscription } = useBillingPageBoot();

  // Can't continue if the main subscription is not loaded.
  if (!mainSubscription) {
    return null;
  }
  const handleCancelSubBtnClick = () => {
    openAlert('cancel-main-subscription');
  };
  const handleResumeSubBtnClick = () => {
    openAlert('resume-main-subscription');
  };
  const handleUpdatePaymentMethod = () => {
    window.LemonSqueezy.Url.Open(
      mainSubscription.lemonUrls?.updatePaymentMethod,
    );
  };
  // Handle upgrade button click.
  const handleUpgradeBtnClick = () => {
    openDrawer(DRAWERS.CHANGE_SUBSCARIPTION_PLAN);
  };

  return (
    <Card className={styles.root}>
      <Stack spacing={6}>
        <h1 className={styles.title}>{mainSubscription.planName}</h1>

        <Group
          spacing={0}
          className={clsx(styles.period, {
            [Classes.INTENT_DANGER]: includes(
              ['on_trial', 'inactive'],
              mainSubscription.status,
            ),
            [Classes.INTENT_SUCCESS]: includes(
              ['active', 'canceled'],
              mainSubscription.status,
            ),
          })}
        >
          <Text className={styles.periodStatus}>
            {mainSubscription.statusFormatted}
          </Text>

          <SubscriptionStatusText subscription={mainSubscription} />
        </Group>
      </Stack>

      <Text className={styles.description}>
        Control your business bookkeeping with automated accounting, to run
        intelligent reports for faster decision-making.
      </Text>

      <Stack align="flex-start" spacing={8} className={styles.actions}>
        <Button
          minimal
          small
          intent={Intent.PRIMARY}
          onClick={handleUpgradeBtnClick}
        >
          {intl.get('subscription.action.upgrade_plan')}
        </Button>

        {mainSubscription.canceled && (
          <Button
            minimal
            small
            intent={Intent.PRIMARY}
            onClick={handleResumeSubBtnClick}
          >
            {intl.get('subscription.action.resume')}
          </Button>
        )}
        {!mainSubscription.canceled && (
          <Button
            minimal
            small
            intent={Intent.PRIMARY}
            onClick={handleCancelSubBtnClick}
          >
            {intl.get('subscription.action.cancel')}
          </Button>
        )}
        <Button
          minimal
          small
          intent={Intent.PRIMARY}
          onClick={handleUpdatePaymentMethod}
        >
          {intl.get('subscription.action.change_payment_method')}
        </Button>
      </Stack>

      <Group position={'apart'} style={{ marginTop: 'auto' }}>
        <Group spacing={4}>
          <Text className={styles.priceAmount}>
            {mainSubscription.planPriceFormatted}
          </Text>

          {mainSubscription.planPeriod && (
            <Text className={styles.pricePeriod}>
              {mainSubscription.planPeriod === 'month'
                ? 'mo'
                : mainSubscription.planPeriod === 'year'
                ? 'yearly'
                : ''}
            </Text>
          )}
        </Group>

        <Box>
          {mainSubscription.canceled && (
            <Button
              intent={Intent.PRIMARY}
              onClick={handleResumeSubBtnClick}
              className={styles.subscribeButton}
            >
              {intl.get('subscription.action.resume')}
            </Button>
          )}
        </Box>
      </Group>
    </Card>
  );
}

/**
 * Тип указан явно. Сборка из двух и более обёрток теряет знание о том, что
 * на выходе компонент, и место применения получает «ничто» — отсюда «нельзя
 * использовать как компонент». Обёртки сами подставляют всё, что нужно, поэтому
 * снаружи компонент вызывается без свойств (Д9 карты v75).
 */
export const Subscription: React.FC = compose(
  withAlertActions,
  withDrawerActions,
)(SubscriptionRoot);

function SubscriptionStatusText({ subscription }: { subscription: any }) {
  const text = getSubscriptionStatusText(subscription);

  if (!text) return null;

  return <Text className={styles.periodText}>{text}</Text>;
}
