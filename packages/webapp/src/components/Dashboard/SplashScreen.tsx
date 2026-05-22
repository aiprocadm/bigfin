// @ts-nocheck
import * as R from 'ramda';
import BigFinLoading from './BigFinLoading';
import { withDashboard } from '@/containers/Dashboard/withDashboard';

function SplashScreenComponent({ splashScreenLoading }) {
  return splashScreenLoading ? <BigFinLoading /> : null;
}

export const SplashScreen = R.compose(
  withDashboard(({ splashScreenLoading }) => ({
    splashScreenLoading,
  })),
)(SplashScreenComponent);
