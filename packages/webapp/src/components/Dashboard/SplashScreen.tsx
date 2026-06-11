// @ts-nocheck
import * as R from 'ramda';
import BigfinLoading from './BigfinLoading';
import { withDashboard } from '@/containers/Dashboard/withDashboard';

function SplashScreenComponent({ splashScreenLoading }) {
  return splashScreenLoading ? <BigfinLoading /> : null;
}

export const SplashScreen = R.compose(
  withDashboard(({ splashScreenLoading }) => ({
    splashScreenLoading,
  })),
)(SplashScreenComponent);
