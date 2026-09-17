import React from 'react';
import intl from 'react-intl-universal';
import styled from 'styled-components';
import { curry } from 'lodash/fp';
import { useHistory } from 'react-router-dom';
import {
  Popover,
  Menu,
  Position,
  Button,
  MenuItem,
  Classes,
} from '@blueprintjs/core';
import { Icon } from '@/components';

import { useAccountTransactionsContext } from './AccountTransactionsProvider';
import { useAppShellContext } from '@/components/AppShell/AppContentShell/AppContentShellProvider';

function AccountSwitchButton() {
  const { currentAccount } = useAccountTransactionsContext();

  return (
    <AccountSwitchButtonBase
      minimal={true}
      rightIcon={<Icon icon={'caret-down-16'} iconSize={16} />}
    >
      <AccountSwitchText>{currentAccount.name}</AccountSwitchText>
    </AccountSwitchButtonBase>
  );
}

function AccountSwitchItem() {
  const { push } = useHistory();
  const { cashflowAccounts, accountId } = useAccountTransactionsContext();

  // Handle item click.
  const handleItemClick = curry((account: any, event: any) => {
    push(`/cashflow-accounts/${account.id}/transactions`);
  });

  const items = cashflowAccounts.map((account: any) => (
    <AccountSwitchMenuItem
      key={account.id}
      name={account.name}
      balance={account.formatted_amount}
      onClick={handleItemClick(account)}
      active={account.id === accountId}
    />
  ));

  return (
    <Popover
      content={<Menu>{items}</Menu>}
      position={Position.BOTTOM_LEFT}
      minimal={true}
    >
      <AccountSwitchButton />
    </Popover>
  );
}

function AccountBalanceItem() {
  const { currentAccount } = useAccountTransactionsContext();

  return (
    <AccountBalanceItemWrap>
      {intl.get('cash_flow_transaction.balance_in_bigfin')} {''}
      <AccountBalanceAmount>
        {currentAccount.formatted_amount}
      </AccountBalanceAmount>
    </AccountBalanceItemWrap>
  );
}

function AccountBankBalanceItem() {
  const { currentAccount } = useAccountTransactionsContext();

  return (
    <AccountBalanceItemWrap>
      {intl.get('cash_flow_transaction.balance_in_bank')}
      <AccountBalanceAmount>
        {currentAccount.bank_balance_formatted}
      </AccountBalanceAmount>
    </AccountBalanceItemWrap>
  );
}

function AccountNumberItem() {
  const { currentAccount } = useAccountTransactionsContext();

  if (!currentAccount.account_mask) return null;

  return (
    <AccountBalanceItemWrap>
      {intl.get('cash_flow_transaction.account_number_mask', {
        mask: currentAccount.account_mask,
      })}
    </AccountBalanceItemWrap>
  );
}

function AccountTransactionsDetailsBarSkeleton() {
  return (
    <React.Fragment>
      <DetailsBarSkeletonBase className={Classes.SKELETON}>
        X
      </DetailsBarSkeletonBase>
      <DetailsBarSkeletonBase className={Classes.SKELETON}>
        X
      </DetailsBarSkeletonBase>
    </React.Fragment>
  );
}

function AccountTransactionsDetailsContent() {
  const { hideAside } = useAppShellContext();

  return (
    <React.Fragment>
      <AccountSwitchItem />

      {/** Hide some details once the aside opens to preserve space on details bar. */}
      {hideAside && <AccountNumberItem />}
      <AccountBalanceItem />
      {hideAside && <AccountBankBalanceItem />}
    </React.Fragment>
  );
}

export function AccountTransactionsDetailsBar() {
  const { isCurrentAccountLoading } = useAccountTransactionsContext();

  return (
    <AccountTransactionDetailsWrap>
      {isCurrentAccountLoading ? (
        <AccountTransactionsDetailsBarSkeleton />
      ) : (
        <AccountTransactionsDetailsContent />
      )}
    </AccountTransactionDetailsWrap>
  );
}

interface AccountSwitchMenuItemProps {
  name: string;
  balance: string;
  [key: string]: any;
}

/**
 * Строка счёта в переключателе счетов.
 *
 * Здесь была подпись «Операции 25» — число вшито в разметку и одинаково у
 * ВСЕХ счетов: настоящего числа операций не отдаёт ни сервер, ни витрина
 * (поля нет нигде в коде). Подпись снята: пустое место честнее выдуманной
 * цифры. Вернуть её можно, когда список счетов начнёт приносить счётчик
 * (Д9 карты v88).
 */
function AccountSwitchMenuItem({
  name,
  balance,
  ...restProps
}: AccountSwitchMenuItemProps) {
  return (
    <MenuItem
      label={balance}
      text={<AccountSwitchItemName>{name}</AccountSwitchItemName>}
      {...restProps}
    />
  );
}

const DetailsBarSkeletonBase = styled.div`
  letter-spacing: 10px;
  margin-right: 10px;
  margin-left: 10px;
  font-size: 8px;
  width: 140px;
`;

const AccountBalanceItemWrap = styled.div`
  margin-left: 18px;
  // color: #5f6d86;
`;

const AccountTransactionDetailsWrap = styled.div`
  display: flex;
  background: var(--color-bank-transactions-details-bar-background);
  color: var(--color-bank-transactions-details-bar-text);
  border-bottom: 1px solid var(--color-bank-transactions-details-bar-divider);
  padding: 0 22px;
  height: 42px;
  align-items: center;
`;
const AccountSwitchText = styled.div`
  font-weight: 600;
  font-size: 14px;
`;

const AccountBalanceAmount = styled.span`
  font-weight: 600;
  display: inline-block;
  // color: rgb(31, 50, 85);
  margin-left: 10px;
`;

const AccountSwitchItemName = styled.div`
  font-weight: 600;
`;
const AccountSwitchButtonBase = styled(Button)`
  .bp4-button-text {
    margin-right: 5px;
  }
`;
