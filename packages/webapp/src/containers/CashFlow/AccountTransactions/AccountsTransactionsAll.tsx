// @ts-nocheck
import styled from 'styled-components';

import '@/style/pages/CashFlow/AccountTransactions/List.scss';

import { AccountTransactionsDataTableV2 } from './v2/AccountTransactionsDataTableV2';
import { AccountTransactionsAllProvider } from './AccountTransactionsAllBoot';

const Box = styled.div`
  margin: 30px 15px;
`;

const CashflowTransactionsTableCard = styled.div`
  background: var(--color-bank-transactions-content-background);
  border: 2px solid var(--color-bank-transactions-content-border);
  border-radius: 10px;
  padding: 30px 18px;
  flex: 0 1;
`;

export default function AccountTransactionsAll() {
  return (
    <AccountTransactionsAllProvider>
      <Box>
        <CashflowTransactionsTableCard>
          <AccountTransactionsDataTableV2 />
        </CashflowTransactionsTableCard>
      </Box>
    </AccountTransactionsAllProvider>
  );
}
