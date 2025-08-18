import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const navigationItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊', permission: null },
  { path: '/tasks', label: 'Tasks', icon: '📋', permission: null },
  { path: '/employees', label: 'Employees', icon: '👥', permission: 'employee.read' },
  { path: '/users', label: 'User Management', icon: '👤', permission: 'roles.manage' },
  { path: '/analytics', label: 'Analytics', icon: '📈', permission: null },
  { path: '/profile', label: 'Profile', icon: '⚙️', permission: null },
];

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const hasPermission = (permission: string | null) => {
    if (!permission) return true;
    if (!user || !user.permissions || !Array.isArray(user.permissions)) return false;
    return user.permissions.includes(permission) || user.permissions.includes('*');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <aside className="w-64 bg-card border-r border-border shadow-sm">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">G3</span>
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm">Go3net</h2>
            <p className="text-xs text-muted-foreground">Technologies</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {(Array.isArray(navigationItems) ? navigationItems : [])
            .filter(item => hasPermission(item.permission))
            .map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
        </ul>
      </nav>
      
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            Logged in as
          </p>
          <p className="text-sm font-medium text-foreground truncate">
            {user?.email}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {user?.role}
          </p>
        </div>
      </div>
    </aside>
  );
};