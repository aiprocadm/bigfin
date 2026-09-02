import React from 'react';
import styled from 'styled-components';

const FinancialStatementRoot = styled.div``;
const FinancialStatementBodyRoot = styled.div``;

/**
 * 
 * @returns {React.JSX}
 */
export function FinancialReport({ children, className }: any) {
  return <FinancialStatementRoot children={children} className={className} />;
}

/**
 *
 * @param {React.JSX}
 */
export function FinancialReportBody({ children, className }: any) {
  return (
    <FinancialStatementBodyRoot children={children} className={className} />
  );
}
