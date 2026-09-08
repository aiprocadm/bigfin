import React from 'react';
import styled from 'styled-components';
import { Classes } from '@blueprintjs/core';

/**
 * Dialog footer actions.
 * @returns {React.JSX}
 */
interface DialogFooterActionsProps {
  /** Куда прижать кнопки. */
  alignment?: 'left' | 'right' | 'center';
  children?: React.ReactNode;
}

export function DialogFooterActions({
  alignment = 'right',
  children,
}: DialogFooterActionsProps) {
  return (
    <DialogFooterActionsRoot
      className={Classes.DIALOG_FOOTER_ACTIONS}
      alignment={alignment}
    >
      {children}
    </DialogFooterActionsRoot>
  );
}

/**
 * Dialog footer.
 * @returns {React.JSX}
 */
export function DialogFooter({ ...props }) {
  return <DialogFooterRoot {...props} />;
}

const DialogFooterRoot = styled.div`
  flex: 0 0 auto;
  margin: 0 20px;
`;

/** Обёртка читает `alignment` — значит, его надо объявить (Д8 карты v76). */
const DialogFooterActionsRoot = styled.div<{ alignment?: string }>`
  ${(props) =>
    props.alignment === 'right' ? 'margin-left: auto;' : 'margin-right: auto;'};

  .bp4-button {
    margin-left: 5px;
    margin-left: 5px;
  }
`;
