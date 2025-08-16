import React from 'react';
import { Card } from '../../ui/card';

export const UserManagement: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
        <p className="text-muted-foreground">Manage users, roles and permissions</p>
      </div>
      <Card className="p-8">
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-4">User Management System</h3>
          <p className="text-muted-foreground">This feature is coming soon. You'll be able to manage user accounts, assign roles, and configure permissions from here.</p>
        </div>
      </Card>
    </div>
  );
};