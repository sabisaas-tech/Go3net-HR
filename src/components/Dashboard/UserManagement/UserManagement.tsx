import React, { useState } from 'react';
import styles from './UserManagement.module.css';
import { Plus, Search, Edit, Trash2, Shield } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  lastActive: string;
  isActive: boolean;
}

interface UserManagementProps {
  currentUserRole: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUserRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Mock data - in real app, this would come from your role service
  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@go3net.com.ng',
      role: 'super-admin',
      department: 'IT',
      lastActive: '2 hours ago',
      isActive: true
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@go3net.com.ng',
      role: 'hr-admin',
      department: 'Human Resources',
      lastActive: '5 minutes ago',
      isActive: true
    },
    {
      id: '3',
      name: 'Mike Wilson',
      email: 'mike.wilson@go3net.com.ng',
      role: 'manager',
      department: 'Operations',
      lastActive: '1 day ago',
      isActive: true
    },
    {
      id: '4',
      name: 'Emily Davis',
      email: 'emily.davis@go3net.com.ng',
      role: 'hr-staff',
      department: 'Human Resources',
      lastActive: '3 hours ago',
      isActive: true
    },
    {
      id: '5',
      name: 'David Brown',
      email: 'david.brown@go3net.com.ng',
      role: 'employee',
      department: 'Marketing',
      lastActive: '30 minutes ago',
      isActive: true
    }
  ]);

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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const canManageUsers = ['super-admin', 'hr-admin'].includes(currentUserRole);
  const canEditRoles = ['super-admin'].includes(currentUserRole);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>User Management</h2>
        {canManageUsers && (
          <button className={styles.addButton}>
            <Plus size={18} />
            Add User
          </button>
        )}
      </div>

      <div className={styles.filters}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
          <input
            type="text"
            placeholder="Search users..."
            className={styles.searchInput}
            style={{ paddingLeft: '2.5rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select
          className={styles.roleFilter}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="super-admin">Super Admin</option>
          <option value="hr-admin">HR Admin</option>
          <option value="manager">Manager</option>
          <option value="hr-staff">HR Staff</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      <div className={styles.userGrid}>
        {filteredUsers.map(user => (
          <div key={user.id} className={styles.userCard}>
            <div className={styles.userHeader}>
              <div className={styles.userInfo}>
                <div className={styles.userAvatar}>
                  {getInitials(user.name)}
                </div>
                <div className={styles.userDetails}>
                  <h4>{user.name}</h4>
                  <p>{user.email}</p>
                  <p>{user.department}</p>
                </div>
              </div>
              
              {canManageUsers && (
                <div className={styles.userActions}>
                  <button className={styles.actionButton}>
                    <Edit size={16} />
                  </button>
                  {canEditRoles && (
                    <button className={styles.actionButton}>
                      <Shield size={16} />
                    </button>
                  )}
                  <button className={`${styles.actionButton} ${styles.danger}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className={styles.userMeta}>
              <div className={`${styles.roleTag} ${styles[getRoleTagClass(user.role)]}`}>
                {user.role.replace('-', ' ')}
              </div>
              <div className={styles.lastActive}>
                Last active: {user.lastActive}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};