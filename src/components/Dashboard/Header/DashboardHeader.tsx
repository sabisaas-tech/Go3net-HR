import React from 'react';
import { useLocation } from 'react-router-dom';
import styles from './DashboardHeader.module.css';
import { Menu, Search, Bell, ChevronRight } from 'lucide-react';

interface DashboardHeaderProps {
  userName: string;
  userEmail: string;
  userRole: string;
  onMenuToggle: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName,
  userEmail,
  userRole,
  onMenuToggle
}) => {
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    const routes: { [key: string]: string } = {
      '/': 'Dashboard',
      '/admin': 'System Administration',
      '/users': 'User Management',
      '/roles': 'Roles & Permissions',
      '/employees': 'Employee Management',
      '/team': 'Team Management',
      '/profile': 'My Profile',
      '/tasks': 'Task Management',
      '/leave': 'Leave Management',
      '/analytics': 'Analytics & Reports'
    };
    return routes[pathname] || 'Dashboard';
  };

  const getBreadcrumbs = (pathname: string) => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return ['Dashboard'];
    
    const breadcrumbs = ['Dashboard'];
    segments.forEach(segment => {
      const formatted = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');
      breadcrumbs.push(formatted);
    });
    
    return breadcrumbs;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const breadcrumbs = getBreadcrumbs(location.pathname);
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className={styles.header}>
      <div className={styles.leftSection}>
        <button className={styles.menuButton} onClick={onMenuToggle}>
          <Menu size={20} />
        </button>
        
        <div>
          <div className={styles.breadcrumb}>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb}>
                <span>{crumb}</span>
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight size={14} className={styles.breadcrumbSeparator} />
                )}
              </React.Fragment>
            ))}
          </div>
          <h1 className={styles.pageTitle}>{pageTitle}</h1>
        </div>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.searchContainer}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search..."
            className={styles.searchInput}
          />
        </div>

        <button className={styles.notificationButton}>
          <Bell size={18} />
          <div className={styles.notificationBadge}></div>
        </button>

        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {getInitials(userName)}
          </div>
          <div className={styles.userDetails}>
            <div className={styles.userName}>{userName}</div>
            <div className={styles.userRole}>{userRole.replace('-', ' ')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};