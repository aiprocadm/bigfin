import { useEffect } from 'react';
import * as R from 'ramda';

import { Box } from '@/components';
import { SubscriptionPlansSection } from './SubscriptionPlansSection';
import { withSubscriptionPlansActions } from '../../Subscriptions/withSubscriptionPlansActions';
import styles from './SetupSubscription.module.scss';
import { loadLemonSqueezy } from '@/lib/lemonSqueezy';

/**
 * Subscription step of wizard setup.
 */
function SetupSubscription({
  // #withSubscriptionPlansActions
  initSubscriptionPlans,
}: {
  initSubscriptionPlans: () => void;
}) {
  useEffect(() => {
    initSubscriptionPlans();
  }, [initSubscriptionPlans]);

  useEffect(() => {
    // Виджет не скачался — экран тарифов всё равно показываем; ошибку
    // человек увидит при нажатии «Подписаться».
    loadLemonSqueezy()
      .then((lemonSqueezy) =>
        lemonSqueezy.Setup({
          eventHandler: (event) => {
            // Do whatever you want with this event data
            if (event.event === 'Checkout.Success') {
            }
          },
        }),
      )
      .catch(() => undefined);
  }, []);

  return (
    <Box className={styles.root}>
      <SubscriptionPlansSection />
    </Box>
  );
}

export default R.compose(withSubscriptionPlansActions)(SetupSubscription);
