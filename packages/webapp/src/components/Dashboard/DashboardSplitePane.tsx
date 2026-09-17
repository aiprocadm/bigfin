import React, { useState, useRef } from 'react';
import SplitPane, { SplitPaneProps } from 'react-split-pane';
import { debounce } from 'lodash';

import { withDashboard } from '@/containers/Dashboard/withDashboard';
import { compose } from '@/utils';

interface DashboardSplitPaneProps {
  // #withDashboard
  sidebarExpended: boolean;
  children?: React.ReactNode;
}

/**
 * Объявления `react-split-pane` писались до React 18 и не знают о `children`
 * (React 18 убрал их из свойств по умолчанию) — а сама панель детей рисует.
 * Дополняем объявление, а не библиотеку (Д8 карты v85).
 */
const SplitPaneWithChildren = SplitPane as unknown as React.ComponentType<
  SplitPaneProps & { children?: React.ReactNode }
>;

function DashboardSplitPane({
  sidebarExpended,
  children,
}: DashboardSplitPaneProps) {
  const initialSize = 220;

  const [defaultSize, setDefaultSize] = useState(
    parseInt(localStorage.getItem('dashboard-size') ?? '', 10) || initialSize,
  );
  const debounceSaveSize = useRef(
    debounce((size: number) => {
      localStorage.setItem('dashboard-size', String(size));
    }, 500),
  );
  const handleChange = (size: number) => {
    debounceSaveSize.current(size);
    setDefaultSize(size);
  };
  return (
    <SplitPaneWithChildren
      allowResize={sidebarExpended}
      split="vertical"
      minSize={180}
      maxSize={300}
      defaultSize={sidebarExpended ? defaultSize : 50}
      size={sidebarExpended ? defaultSize : 50}
      onChange={handleChange}
      className="primary"
    >
      {children}
    </SplitPaneWithChildren>
  );
}

export default compose(
  withDashboard(({ sidebarExpended }) => ({ sidebarExpended })),
)(DashboardSplitPane);
