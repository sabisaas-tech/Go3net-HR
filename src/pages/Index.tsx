import React, { useState } from 'react';
import Dashboard from './Dashboard';
import { RoleSwitcher } from '../components/RoleSwitcher/RoleSwitcher';

const Index = () => {
  // Demo state for role switching - in a real app, this would come from authentication
  const [currentRole, setCurrentRole] = useState('hr-admin');
  
  const getUserData = (role: string) => {
    const userData: { [key: string]: { name: string; email: string } } = {
      'super-admin': { name: 'John Doe', email: 'john.doe@go3net.com.ng' },
      'hr-admin': { name: 'Sarah Johnson', email: 'sarah.johnson@go3net.com.ng' },
      'manager': { name: 'Mike Wilson', email: 'mike.wilson@go3net.com.ng' },
      'hr-staff': { name: 'Emily Davis', email: 'emily.davis@go3net.com.ng' },
      'employee': { name: 'David Brown', email: 'david.brown@go3net.com.ng' }
    };
    return userData[role] || userData['employee'];
  };

  const user = getUserData(currentRole);
  
  return (
    <>
      <Dashboard 
        userRole={currentRole}
        userName={user.name}
        userEmail={user.email}
      />
      <RoleSwitcher 
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
      />
    </>
  );
};

export default Index;
