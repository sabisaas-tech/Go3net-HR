import React, { useState } from 'react';
import styles from './DashboardLayout.module.css';
import { Sidebar } from './Sidebar/Sidebar';
import { DashboardHeader } from './Header/DashboardHeader';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  userRole = 'employee',
  userName = 'John Doe',
  userEmail = 'john.doe@go3net.com.ng'
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.mobileOpen : ''}`}>
        <Sidebar 
          userRole={userRole}
          onCloseMobile={() => setSidebarOpen(false)}
        />
      </div>
      
      <div className={styles.mainContent}>
        <div className={styles.header}>
          <DashboardHeader 
            userName={userName}
            userEmail={userEmail}
            userRole={userRole}
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>
        
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
};