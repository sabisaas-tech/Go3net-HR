import React from 'react';
import { Card } from '../../ui/card';
import styles from './UserManagement.module.css';

export const UserManagement: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>User Management</h1>
        <p>Manage users, roles and permissions</p>
      </div>
      <Card className={styles.card}>
        <div className={styles.content}>
          <h3>User Management System</h3>
          <p>This feature is coming soon. You'll be able to manage user accounts, assign roles, and configure permissions from here.</p>
        </div>
      </Card>
    </div>
  );
};