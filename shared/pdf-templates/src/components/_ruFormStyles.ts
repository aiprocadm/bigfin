import { CSSProperties } from 'react';

/** Общие инлайн-стили российских печатных форм (②c). */

export const ruCell: CSSProperties = {
  border: '1px solid #000',
  padding: '2px 6px',
  fontSize: 12,
  verticalAlign: 'top',
};

export const ruCellNoBorder: CSSProperties = {
  ...ruCell,
  border: 'none',
  padding: '2px 0',
};

export const ruTable: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
};

export const ruSmall: CSSProperties = { fontSize: 9, lineHeight: 1.1 };

export const ruBold: CSSProperties = { fontWeight: 700 };

export const ruPage: CSSProperties = {
  padding: '40px 35px',
  color: '#000',
  fontFamily: "'Open Sans', sans-serif",
  fontSize: 12,
  lineHeight: 1.25,
};
