import React from 'react';
import styles from './RoleSwitcher.module.css';

interface RoleSwitcherProps {
  currentRole: string;
  onRoleChange: (role: string) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ currentRole, onRoleChange }) => {
  const roles = [
    { value: 'super-admin', label: 'Super Admin' },
    { value: 'hr-admin', label: 'HR Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'hr-staff', label: 'HR Staff' },
    { value: 'employee', label: 'Employee' }
  ];

  return (
    <div className={styles.switcher}>
      <div className={styles.title}>Demo: Switch Role</div>
      <select 
        className={styles.select}
        value={currentRole}
        onChange={(e) => onRoleChange(e.target.value)}
      >
        {roles.map(role => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
      <div className={styles.note}>
        Switch roles to see different dashboard views and permissions
      </div>
    </div>
  );
};