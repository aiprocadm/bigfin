import { ChangeEvent } from 'react';
import intl from 'react-intl-universal';
import * as R from 'ramda';
import { Intent, Switch, Tag, Text } from '@blueprintjs/core';
import { Group } from '@/components';
import {
  withSubscriptionPlansActions,
  WithSubscriptionPlansActionsProps,
} from '@/containers/Subscriptions/withSubscriptionPlansActions';
import { SubscriptionPlansPeriod } from '@/store/plans/plans.reducer';
import styles from './SetupSubscription.module.scss';

interface SubscriptionPlansPeriodsSwitchCombinedProps
  extends WithSubscriptionPlansActionsProps { }

function SubscriptionPlansPeriodSwitcherRoot({
  // #withSubscriptionPlansActions
  changeSubscriptionPlansPeriod,
}: SubscriptionPlansPeriodsSwitchCombinedProps) {
  // Handles the period switch change.
  const handleSwitchChange = (event: ChangeEvent<HTMLInputElement>) => {
    changeSubscriptionPlansPeriod(
      event.currentTarget.checked
        ? SubscriptionPlansPeriod.Annually
        : SubscriptionPlansPeriod.Monthly,
    );
  };
  return (
    <Group position={'center'} spacing={10} style={{ marginBottom: '1.6rem' }}>
      <Text>{intl.get('setup.subscription.period.monthly')}</Text>
      <Switch
        large
        onChange={handleSwitchChange}
        className={styles.periodSwitch}
      />
      <Text>
        {intl.get('setup.subscription.period.yearly')}{' '}
        <Tag minimal intent={Intent.NONE}>
          {intl.get('setup.subscription.period.discount')}
        </Tag>
      </Text>
    </Group>
  );
}

export const SubscriptionPlansPeriodSwitcher = R.compose(
  withSubscriptionPlansActions,
)(SubscriptionPlansPeriodSwitcherRoot);
