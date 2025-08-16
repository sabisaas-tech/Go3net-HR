import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Settings, 
  FileText, 
  Calendar,
  ClipboardList,
  TrendingUp,
  Shield,
  X
} from 'lucide-react';

interface SidebarProps {
  userRole: string;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole, onCloseMobile }) => {
  const location = useLocation();

  const getNavigationItems = (role: string) => {
    const baseItems = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/', section: 'Main' }
    ];

    switch (role) {
      case 'super-admin':
        return [
          ...baseItems,
          { icon: Shield, label: 'System Admin', path: '/admin', section: 'Admin' },
          { icon: Users, label: 'All Users', path: '/users', section: 'User Management' },
          { icon: UserCheck, label: 'Roles & Permissions', path: '/roles', section: 'User Management' },
          { icon: TrendingUp, label: 'Analytics', path: '/analytics', section: 'Reports' },
          { icon: Settings, label: 'System Settings', path: '/settings', section: 'Admin' }
        ];

      case 'hr-admin':
        return [
          ...baseItems,
          { icon: Users, label: 'Employee Management', path: '/employees', section: 'HR Management' },
          { icon: UserCheck, label: 'Role Assignment', path: '/role-assignment', section: 'HR Management' },
          { icon: FileText, label: 'Recruitment', path: '/recruitment', section: 'HR Management' },
          { icon: TrendingUp, label: 'HR Reports', path: '/hr-reports', section: 'Reports' },
          { icon: Calendar, label: 'Payroll', path: '/payroll', section: 'HR Management' }
        ];

      case 'manager':
        return [
          ...baseItems,
          { icon: Users, label: 'Team Members', path: '/team', section: 'Team Management' },
          { icon: ClipboardList, label: 'Task Management', path: '/tasks', section: 'Team Management' },
          { icon: Calendar, label: 'Leave Approvals', path: '/leave-approvals', section: 'Team Management' },
          { icon: TrendingUp, label: 'Team Performance', path: '/performance', section: 'Reports' }
        ];

      case 'hr-staff':
        return [
          ...baseItems,
          { icon: Users, label: 'Employee Directory', path: '/directory', section: 'HR' },
          { icon: FileText, label: 'Recruitment Support', path: '/recruitment-support', section: 'HR' },
          { icon: ClipboardList, label: 'Onboarding', path: '/onboarding', section: 'HR' }
        ];

      default: // employee
        return [
          ...baseItems,
          { icon: UserCheck, label: 'My Profile', path: '/profile', section: 'Personal' },
          { icon: Calendar, label: 'Leave Requests', path: '/leave', section: 'Personal' },
          { icon: ClipboardList, label: 'My Tasks', path: '/my-tasks', section: 'Personal' },
          { icon: FileText, label: 'Documents', path: '/documents', section: 'Personal' }
        ];
    }
  };

  const navigationItems = getNavigationItems(userRole);
  const sections = [...new Set(navigationItems.map(item => item.section))];

  const getRoleTagClass = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'super-admin': 'superAdmin',
      'hr-admin': 'hrAdmin',
      'manager': 'manager',
      'hr-staff': 'hrStaff',
      'employee': 'employee'
    };
    return roleMap[role] || 'employee';
  };

  return (
    <div className={styles.sidebar}>
      <button className={styles.mobileCloseBtn} onClick={onCloseMobile}>
        <X size={20} />
      </button>
      
      <div className={styles.logo}>
        <div className={styles.logoIcon}>G3</div>
        <div className={styles.logoText}>
          <span className={styles.logoTextBlue}>Go3</span>
          <span className={styles.logoTextGreen}>NET</span>
        </div>
      </div>

      <nav className={styles.navigation}>
        {sections.map(section => (
          <div key={section} className={styles.navSection}>
            <div className={styles.sectionTitle}>{section}</div>
            {navigationItems
              .filter(item => item.section === section)
              .map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                    onClick={onCloseMobile}
                  >
                    <Icon className={styles.navIcon} />
                    <span className={styles.navText}>{item.label}</span>
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>

      <div className={styles.userSection}>
        <div>Current Role</div>
        <div className={`${styles.roleTag} ${styles[getRoleTagClass(userRole)]}`}>
          {userRole.replace('-', ' ')}
        </div>
      </div>
    </div>
  );
};