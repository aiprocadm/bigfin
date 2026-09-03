import React from 'react';
import * as R from 'ramda';
import { withFeatureCan } from './withFeatureCan';

function FeatureCanJSX({ feature, children, isFeatureCan }: any) {
  return isFeatureCan && children;
}

export const FeatureCan = R.compose(
  withFeatureCan(({ isFeatureCan }: any) => ({
    isFeatureCan,
  })),
)(FeatureCanJSX);
