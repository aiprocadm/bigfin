// @ts-nocheck
import React from 'react';
import { Choose } from '@/components';
import BigfinLoading from './BigfinLoading';

/**
 * Dashboard loading indicator.
 */
export default function DashboardLoadingIndicator({
  isLoading = false,
  className,
  children,
}) {
  return (
    <Choose>
      <Choose.When condition={isLoading}>
        <BigfinLoading />        
      </Choose.When>

      <Choose.Otherwise>
        { children }
      </Choose.Otherwise>
    </Choose>
  );
}
