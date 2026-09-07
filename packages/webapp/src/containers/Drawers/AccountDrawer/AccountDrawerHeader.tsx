import React from 'react';
import { isEmpty } from 'lodash';

import {
  Icon,
  DetailsMenu,
  DetailItem,
  FormattedMessage as T,
} from '@/components';
import { useAccountDrawerContext } from './AccountDrawerProvider';
import { accountTypeLabel } from '@/utils/accountTypeLabel';

/**
 *  Account drawer header.
 */
export default function AccountDrawerHeader() {
  const { account } = useAccountDrawerContext();

  return (
    <div className={'account-drawer__content-header'}>
      <DetailsMenu>
        <DetailItem
          name={'closing-balance'}
          label={<T id={'closing_balance'} />}
        >
          <h3 className={'big-number'}>{account.formatted_amount}</h3>
        </DetailItem>

        <DetailItem name={'account-type'} label={<T id={'account_type'} />}>
          {/* Подпись типа — из словаря по ключу: сервер отдаёт её
              по-английски (С1 карты v29). */}
          {accountTypeLabel(account.account_type, account.account_type_label)}
        </DetailItem>

        <DetailItem name={'account-normal'} label={<T id={'account_normal'} />}>
          {account.account_normal_formatted}
          <Icon
            iconSize={14}
            icon={`arrow-${
              account.account_normal === 'credit' ? 'down' : 'up'
            }`}
          />
        </DetailItem>

        <DetailItem name={'code'} label={<T id={'code'} />}>
          {account.code}
        </DetailItem>

        <DetailItem name={'currency'} label={<T id={'currency'} />}>
          {account.currency_code}
        </DetailItem>
      </DetailsMenu>

      <DetailsMenu direction={'horizantal'}>
        <DetailItem name={'description'} label={<T id={'description'} />}>
          {!isEmpty(account.description) ? account.description : '--'}
        </DetailItem>
      </DetailsMenu>
    </div>
  );
}
