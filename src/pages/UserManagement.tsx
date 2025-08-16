import React from 'react';
import { DashboardLayout } from '../components/Dashboard/DashboardLayout';
import { UserManagement as UserManagementComponent } from '../components/Dashboard/UserManagement/UserManagement';

const UserManagement: React.FC = () => {
  return (
    <DashboardLayout 
      userRole="super-admin"
      userName="John Doe"
      userEmail="john.doe@go3net.com.ng"
    >
      <UserManagementComponent currentUserRole="super-admin" />
    </DashboardLayout>
  );
};

export default UserManagement;