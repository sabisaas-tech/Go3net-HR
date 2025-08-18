import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../ui/button';

export const DashboardHeader: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-card border-b border-border px-6 py-4 shadow-sm">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Go3net Technologies</h1>
          <p className="text-sm text-muted-foreground">Dashboard</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              {user?.firstName || user?.email}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role}
            </p>
          </div>
          
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {user?.firstName ? user.firstName[0]?.toUpperCase() : user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={logout}
            className="text-muted-foreground hover:text-foreground"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};