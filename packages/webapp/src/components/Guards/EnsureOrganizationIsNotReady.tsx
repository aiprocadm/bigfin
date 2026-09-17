import React from 'react';
import { connect } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { compose } from '@/utils';
import { withAuthentication } from '@/containers/Authentication/withAuthentication';
import { withOrganization } from '@/containers/Organization/withOrganization';

/**
 * Ensures organization is not ready.
 */
interface EnsureOrganizationIsNotReadyProps {
  children?: React.ReactNode;

  // #withOrganization
  isOrganizationReady?: boolean;
  isOrganizationSetupCompleted?: boolean;
}

function EnsureOrganizationIsNotReady({
  children,

  // #withOrganization
  isOrganizationReady,
  isOrganizationSetupCompleted,
}: EnsureOrganizationIsNotReadyProps) {
  return (isOrganizationReady && !isOrganizationSetupCompleted) ? (
    <Redirect to={{ pathname: '/' }} />
  ) : children;
}

export default compose(
  withAuthentication(({ currentOrganizationId }: any) => ({
    currentOrganizationId,
  })),
  connect((state: any, props: any) => ({
    organizationId: props.currentOrganizationId,
  })),
  withOrganization(({
    isOrganizationReady,
    isOrganizationSetupCompleted,
  }: any) => ({
    isOrganizationReady,
    isOrganizationSetupCompleted
  })),
)(EnsureOrganizationIsNotReady);