import React from 'react';
import { DashboardHeader } from './Header/DashboardHeader';
import { Sidebar } from './Sidebar/Sidebar';
import styles from './DashboardLayout.module.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <DashboardHeader />
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
};