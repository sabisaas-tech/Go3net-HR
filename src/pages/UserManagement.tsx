import React from 'react';
import { DashboardLayout } from '../components/Dashboard/DashboardLayout';
import { UserManagement as UserManagementComponent } from '../components/Dashboard/UserManagement/UserManagement';

const UserManagement = () => {
  return (
    <DashboardLayout>
      <UserManagementComponent />
    </DashboardLayout>
  );
};

export default UserManagement;