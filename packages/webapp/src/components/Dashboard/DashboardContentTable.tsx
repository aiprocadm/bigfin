import React from 'react';
import classNames from 'classnames';
import { CLASSES } from '@/constants/classes';

/**
 * Dashboard content table.
 */
export function DashboardContentTable({ children }: any) {
  return (
    <div className={classNames(CLASSES.DASHBOARD_DATATABLE)}>{children}</div>
  );
}
