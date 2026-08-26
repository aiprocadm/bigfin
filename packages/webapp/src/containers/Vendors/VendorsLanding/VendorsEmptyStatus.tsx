// @ts-nocheck
import React from 'react';
import { Button, Intent } from '@blueprintjs/core';
import { useHistory } from 'react-router-dom';
import { EmptyStatus } from '@/components';
import { Can, FormattedMessage as T } from '@/components';
import { VendorAction, AbilitySubject } from '@/constants/abilityOption';

export default function VendorsEmptyStatus() {
  const history = useHistory();

  return (
    <EmptyStatus
      title={<T id={'create_and_manage_your_organization_s_vendors'} />}
      description={
        <p>
          <T id={'vendors.empty.description'} />
        </p>
      }
      action={
        <>
          <Can I={VendorAction.Create} a={AbilitySubject.Vendor}>
            <Button
              intent={Intent.PRIMARY}
              large={true}
              onClick={() => {
                history.push('/vendors/new');
              }}
            >
              <T id={'new_vendor'} />
            </Button>
          </Can>
        </>
      }
    />
  );
}
