import React from 'react';
import { Navbar } from '@blueprintjs/core';
import styles from './DrawerActionBar.module.scss';

export function DrawerActionsBar({ children, ...props }: any) {
  return <Navbar className={styles.root}>{children}</Navbar>;
}
