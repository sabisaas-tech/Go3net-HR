import React from 'react';
import { DashboardLayout } from '../components/Dashboard/DashboardLayout';
import { StatsGrid } from '../components/Dashboard/StatsCard/StatsCard';
import { UserManagement } from '../components/Dashboard/UserManagement/UserManagement';
import { Users, UserCheck, Shield, TrendingUp, Calendar, FileText, ClipboardList, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  userRole = 'hr-admin',
  userName = 'Sarah Johnson',
  userEmail = 'sarah.johnson@go3net.com.ng'
}) => {
  const getStatsForRole = (role: string) => {
    switch (role) {
      case 'super-admin':
        return [
          {
            title: 'Total Users',
            value: 1247,
            icon: Users,
            change: { value: 12, period: 'last month', type: 'positive' as const },
            color: 'blue' as const
          },
          {
            title: 'Active Sessions',
            value: 892,
            icon: Shield,
            change: { value: 5, period: 'last week', type: 'positive' as const },
            color: 'green' as const
          },
          {
            title: 'System Health',
            value: '99.9%',
            icon: TrendingUp,
            change: { value: 0.1, period: 'uptime', type: 'positive' as const },
            color: 'cyan' as const
          },
          {
            title: 'Security Alerts',
            value: 3,
            icon: AlertTriangle,
            change: { value: 2, period: 'yesterday', type: 'negative' as const },
            color: 'orange' as const
          }
        ];

      case 'hr-admin':
        return [
          {
            title: 'Total Employees',
            value: 456,
            icon: Users,
            change: { value: 8, period: 'last month', type: 'positive' as const },
            color: 'blue' as const
          },
          {
            title: 'Active Recruitments',
            value: 23,
            icon: UserCheck,
            change: { value: 15, period: 'this week', type: 'positive' as const },
            color: 'green' as const
          },
          {
            title: 'Pending Leave Requests',
            value: 12,
            icon: Calendar,
            change: { value: 3, period: 'yesterday', type: 'positive' as const },
            color: 'orange' as const
          },
          {
            title: 'Onboarding Tasks',
            value: 8,
            icon: ClipboardList,
            change: { value: 2, period: 'this week', type: 'negative' as const },
            color: 'purple' as const
          }
        ];

      case 'manager':
        return [
          {
            title: 'Team Members',
            value: 15,
            icon: Users,
            change: { value: 1, period: 'this month', type: 'positive' as const },
            color: 'blue' as const
          },
          {
            title: 'Active Projects',
            value: 7,
            icon: ClipboardList,
            change: { value: 2, period: 'this week', type: 'positive' as const },
            color: 'green' as const
          },
          {
            title: 'Team Performance',
            value: '94%',
            icon: TrendingUp,
            change: { value: 5, period: 'last month', type: 'positive' as const },
            color: 'cyan' as const
          },
          {
            title: 'Pending Reviews',
            value: 4,
            icon: FileText,
            change: { value: 1, period: 'this week', type: 'neutral' as const },
            color: 'orange' as const
          }
        ];

      default: // employee
        return [
          {
            title: 'My Tasks',
            value: 12,
            icon: ClipboardList,
            change: { value: 3, period: 'yesterday', type: 'positive' as const },
            color: 'blue' as const
          },
          {
            title: 'Completed Today',
            value: 5,
            icon: UserCheck,
            change: { value: 2, period: 'yesterday', type: 'positive' as const },
            color: 'green' as const
          },
          {
            title: 'Leave Balance',
            value: 18,
            icon: Calendar,
            change: { value: 0, period: 'days remaining', type: 'neutral' as const },
            color: 'cyan' as const
          },
          {
            title: 'Training Progress',
            value: '78%',
            icon: TrendingUp,
            change: { value: 12, period: 'this week', type: 'positive' as const },
            color: 'purple' as const
          }
        ];
    }
  };

  const stats = getStatsForRole(userRole);

  return (
    <DashboardLayout userRole={userRole} userName={userName} userEmail={userEmail}>
      <div>
        <StatsGrid stats={stats} />
        
        {/* Show user management for roles that can manage users */}
        {(['super-admin', 'hr-admin'].includes(userRole)) && (
          <UserManagement currentUserRole={userRole} />
        )}
        
        {/* Role-specific content can be added here */}
        {userRole === 'employee' && (
          <div style={{ 
            background: 'hsl(var(--card))', 
            padding: '2rem', 
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid hsl(var(--border))',
            textAlign: 'center'
          }}>
            <h3 style={{ color: 'hsl(var(--foreground))', marginBottom: '1rem' }}>
              Welcome to Go3net Technologies Dashboard
            </h3>
            <p style={{ color: 'hsl(var(--muted-foreground))' }}>
              Manage your tasks, check your leave balance, and track your progress from here.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;