import React from 'react';
import {
  DrawerHeaderContent,
  DrawerBody,
  FormattedMessage as T,
} from '@/components';
import { DRAWERS } from '@/constants/drawers';
import QuickCreateItemDrawerForm from './QuickCreateItemDrawerForm';

/**
 * Quick create/edit item drawer content.
 */
interface QuickCreateItemDrawerContentProps {
  /** Заготовка названия — то, что человек уже успел напечатать в поле поиска. */
  itemName?: string;
}

export default function QuickCreateItemDrawerContent({
  itemName,
}: QuickCreateItemDrawerContentProps) {
  return (
    <React.Fragment>
      <DrawerHeaderContent
        title={<T id={'create_a_new_item'} />}
      />
      <DrawerBody>
        <QuickCreateItemDrawerForm itemName={itemName} />
      </DrawerBody>
    </React.Fragment>
  );
}
