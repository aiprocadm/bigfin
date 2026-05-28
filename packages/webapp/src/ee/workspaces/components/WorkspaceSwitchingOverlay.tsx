// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { firstLettersArgs } from '@/utils';
import '@/ee/workspaces/style/components/WorkspaceSwitchingOverlay.scss';

interface WorkspaceSwitchingOverlayProps {
  workspaceName: string;
}

/**
 * Mercury-style centered overlay shown during workspace switching.
 * Displays a blurred backdrop with the workspace name and initials.
 */
export function WorkspaceSwitchingOverlay({ workspaceName }: WorkspaceSwitchingOverlayProps) {
  const initials = firstLettersArgs(...(workspaceName || '').split(' '));

  return (
    <div className="workspace-switching-overlay">
      <div className="workspace-switching-overlay__backdrop" />
      <div className="workspace-switching-overlay__card">
        <div className="workspace-switching-overlay__avatar">
          {initials}
        </div>
        <div className="workspace-switching-overlay__subtitle">{intl.get('workspaces.switching_overlay.subtitle')}</div>
        <div className="workspace-switching-overlay__title">{workspaceName}</div>
      </div>
    </div>
  );
}
