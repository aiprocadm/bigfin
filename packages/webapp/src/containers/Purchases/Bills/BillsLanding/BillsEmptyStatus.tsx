// @ts-nocheck
import React from 'react';
import { Button, Intent } from '@blueprintjs/core';
import { useHistory } from 'react-router-dom';
import { EmptyStatus } from '@/components';
import { Can, FormattedMessage as T } from '@/components';
import { BillAction, AbilitySubject } from '@/constants/abilityOption';

export default function BillsEmptyStatus() {
  const history = useHistory();

  return (
    <EmptyStatus
      title={<T id={'bills.empty_state.title'} />}
      description={
        <p>
          <T id="bill_empty_status_description" />
        </p>
      }
      action={
        <>
          <Can I={BillAction.Create} a={AbilitySubject.Bill}>
            <Button
              intent={Intent.PRIMARY}
              large={true}
              onClick={() => {
                history.push('/bills/new');
              }}
            >
              <T id={'new_bill'} />
            </Button>
          </Can>
        </>
      }
    />
  );
}
