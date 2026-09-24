import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import DashboardContentRoutes from '@/components/Dashboard/DashboardContentRoute';
import DashboardErrorBoundary from './DashboardErrorBoundary';
import { RowScopeNotice } from './RowScopeNotice';
import { ReportCacheBar } from './ReportCacheBar';

// Старая верхняя панель (DashboardTopbar) убрана: новый каркас DashboardShell
// уже предоставляет панель (ConnectedTopbar). Раньше рендерились обе.
export default React.forwardRef<HTMLDivElement>((_props, ref) => {
  return (
    <ErrorBoundary FallbackComponent={DashboardErrorBoundary}>
      <div className="dashboard-content" id="dashboard" ref={ref}>
        {/* Роль с ограничением по данным видит пометку на каждом экране (FT-080). */}
        <RowScopeNotice />
        {/* «Данные на …» и «Пересобрать» над экранами отчётов (FT-093). */}
        <ReportCacheBar />
        <DashboardContentRoutes />
      </div>
    </ErrorBoundary>
  );
});
