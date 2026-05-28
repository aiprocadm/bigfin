// @ts-nocheck
import intl from 'react-intl-universal';
import { Tab, Tabs } from '@blueprintjs/core';
import { MatchingBankTransaction } from './MatchingTransaction';
import { CategorizeTransactionContent } from '../CategorizeTransaction/drawers/CategorizeTransactionDrawer/CategorizeTransactionContent';
import styles from './CategorizeTransactionTabs.module.scss';

export function CategorizeTransactionTabs() {
  const defaultSelectedTabId = 'categorize';

  return (
    <Tabs
      large
      renderActiveTabPanelOnly
      defaultSelectedTabId={defaultSelectedTabId}
      className={styles.tabs}
    >
      <Tab
        id="categorize"
        title={intl.get('cash_flow.categorize_transaction.tab.categorize')}
        panel={<CategorizeTransactionContent />}
      />
      <Tab
        id="matching"
        title={intl.get('cash_flow.categorize_transaction.tab.matching')}
        panel={<MatchingBankTransaction />}
      />
    </Tabs>
  );
}
