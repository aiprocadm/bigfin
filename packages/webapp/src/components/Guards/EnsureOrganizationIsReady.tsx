import React from 'react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { compose } from '@/utils';

import { withAuthentication } from '@/containers/Authentication/withAuthentication';
import { withOrganization } from '@/containers/Organization/withOrganization';

interface EnsureOrganizationIsReadyProps {
  // #ownProps
  children?: React.ReactNode;
  redirectTo?: string;

  // #withOrganization
  isOrganizationReady?: boolean;
}

function EnsureOrganizationIsReady({
  children,
  redirectTo = '/setup',
  isOrganizationReady,
}: EnsureOrganizationIsReadyProps) {
  return isOrganizationReady ? (
    children
  ) : (
    <Redirect to={{ pathname: redirectTo }} />
  );
}

export default compose(
  withAuthentication(),
  connect((state: any, props: { currentOrganizationId?: string | null }) => ({
    organizationId: props.currentOrganizationId,
  })),
  withOrganization(({ isOrganizationReady }) => ({ isOrganizationReady })),
)(EnsureOrganizationIsReady);
