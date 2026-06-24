// @ts-nocheck
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import DashboardContentRoutes from '@/components/Dashboard/DashboardContentRoute';
import DashboardErrorBoundary from './DashboardErrorBoundary';

// Старая верхняя панель (DashboardTopbar) убрана: новый каркас DashboardShell
// уже предоставляет панель (ConnectedTopbar). Раньше рендерились обе.
export default React.forwardRef(({}, ref) => {
  return (
    <ErrorBoundary FallbackComponent={DashboardErrorBoundary}>
      <div className="dashboard-content" id="dashboard" ref={ref}>
        <DashboardContentRoutes />
      </div>
    </ErrorBoundary>
  );
});
