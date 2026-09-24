import React from 'react';
import { initials } from '@/utils/initials';

export default function AvatarCell({ row: { original }, size }: any) {
  return (
    <span className="avatar" data-size={size}>
      {initials(original?.display_name ?? '')}
    </span>
  );
}
