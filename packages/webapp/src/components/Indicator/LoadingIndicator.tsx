import React, { useState, useEffect, useMemo } from 'react';
import { Spinner } from '@blueprintjs/core';

interface LoadingIndicatorProps {
  /** Идёт ли загрузка. Пока идёт — вместо содержимого крутится значок. */
  loading?: boolean;
  spinnerSize?: number;
  children?: React.ReactNode;
  /** Отрисовать содержимое сразу, не дожидаясь конца загрузки. */
  mount?: boolean;
}

export function LoadingIndicator({
  loading,
  spinnerSize = 40,
  children,
  mount = false,
}: LoadingIndicatorProps) {
  const [rendered, setRendered] = useState(mount);

  useEffect(() => {
    if (!loading) {
      setRendered(true);
    }
  }, [loading]);

  const componentStyle = useMemo(() => {
    return { display: !loading ? 'block' : 'none' };
  }, [loading]);

  const loadingComponent = useMemo(
    () => (
      <div className="dashboard__loading-indicator">
        <Spinner size={spinnerSize} value={undefined} />
      </div>
    ),
    [spinnerSize],
  );

  // Renders children with wrapper or without wrapper, in mount mode
  // rendering with wrapper.
  const renderChildren = useMemo(
    () => (mount ? <div style={componentStyle}>{children}</div> : children),
    [children, mount, componentStyle],
  );

  // Render children component or not in loading and in mount mode rendering
  // anyway.
  const renderComponent = useMemo(
    () => (!loading || mount ? renderChildren : null),
    [renderChildren, loading, mount],
  );
  const maybeRenderComponent = rendered && children && renderComponent;
  const maybeRenderLoadingSpinner = loading && loadingComponent;

  return (
    <>
      {maybeRenderLoadingSpinner}
      {maybeRenderComponent}
    </>
  );
}
