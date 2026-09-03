import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createSelector } from 'reselect';
import { setFeatureDashboardMeta } from '@/store/dashboard/dashboard.actions';

const featuresSelector = createSelector(
  (state: any) => state.dashboard.features,
  (features: any) => features,
);

export const useFeatureCan = () => {
  const features = useSelector(featuresSelector);

  return {
    featureCan: (feature: any) => {
      return !!features[feature];
    },
  };
};

/**
 * Sets features.
 */
export const useSetFeatureDashboardMeta = () => {
  const dispatch = useDispatch();

  return React.useCallback(
    (features: any) => {
      dispatch(setFeatureDashboardMeta(features));
    },
    [dispatch],
  );
};
