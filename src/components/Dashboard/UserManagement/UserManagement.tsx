import React, { useState, useEffect } from 'react';
import styles from './UserManagement.module.css';
import { Plus, Search, Edit, Trash2, Shield } from 'lucide-react';
import { apiService } from '../../../services/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
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
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await apiService.getEmployees();
      const employees = response.data || [];
      const formattedUsers = employees.map((emp: any) => ({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        role: emp.role || 'employee',
        department: emp.department || 'Unknown',
        lastActive: new Date(emp.updatedAt || emp.createdAt).toLocaleDateString(),
        isActive: emp.status === 'active'
      }));
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const getInitials = (user: User) => {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  };

  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`;
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

      {isLoading ? (
        <div className={styles.loading}>Loading users...</div>
      ) : (
        <div className={styles.userGrid}>
          {filteredUsers.map(user => (
            <div key={user.id} className={styles.userCard}>
              <div className={styles.userHeader}>
                <div className={styles.userInfo}>
                  <div className={styles.userAvatar}>
                    {getInitials(user)}
                  </div>
                  <div className={styles.userDetails}>
                    <h4>{user.firstName} {user.lastName}</h4>
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
      )}
    </div>
  );
};