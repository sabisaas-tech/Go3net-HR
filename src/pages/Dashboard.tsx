import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { DashboardLayout } from '../components/Dashboard/DashboardLayout';
import { StatsCard } from '../components/Dashboard/StatsCard/StatsCard';
import { showToast } from '../services/toastService';

interface Stats {
  totalEmployees: number;
  activeTasks: number;
  completedTasks: number;
  pendingTasks: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    activeTasks: 0,
    completedTasks: 0,
    pendingTasks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [employeeStats, taskStats] = await Promise.all([
          apiService.getEmployeeStatistics().catch(() => ({ data: { total: 0 } })),
          apiService.getTaskStatistics().catch(() => ({ 
            data: { active: 0, completed: 0, pending: 0 }
          }))
        ]);

        setStats({
          totalEmployees: employeeStats.data?.total || 0,
          activeTasks: taskStats.data?.active || 0,
          completedTasks: taskStats.data?.completed || 0,
          pendingTasks: taskStats.data?.pending || 0
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        showToast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (!user) return null;

  const canViewEmployees = user.permissions.includes('employee.read') || 
                           user.permissions.includes('*');
  const canManageTasks = user.permissions.includes('tasks.create') || 
                         user.permissions.includes('*');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user.firstName || user.email}!
          </h1>
          <p className="text-muted-foreground">
            Role: {user.role} | Here's your dashboard overview
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {canViewEmployees && (
            <StatsCard
              title="Total Employees"
              value={stats.totalEmployees.toString()}
              icon="👥"
              description="Active employees in the system"
            />
          )}
          
          <StatsCard
            title="Active Tasks"
            value={stats.activeTasks.toString()}
            icon="⚡"
            description="Tasks currently in progress"
          />
          
          <StatsCard
            title="Completed Tasks"
            value={stats.completedTasks.toString()}
            icon="✅"
            description="Successfully completed tasks"
          />
          
          <StatsCard
            title="Pending Tasks"
            value={stats.pendingTasks.toString()}
            icon="⏳"
            description="Tasks awaiting assignment"
          />
        </div>

        {/* Role-specific content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {canManageTasks && (
                <button className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors">
                  📋 Create New Task
                </button>
              )}
              {canViewEmployees && (
                <button className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors">
                  👤 View Employee Directory
                </button>
              )}
              <button className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors">
                📊 View My Tasks
              </button>
              <button className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors">
                ⏰ Log Time Entry
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Welcome to Go3net Technologies!</span>
              </div>
              <div className="flex items-center space-x-3 p-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Your dashboard is ready to use</span>
              </div>
              <div className="flex items-center space-x-3 p-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm">Check out your role permissions: {user.role}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;