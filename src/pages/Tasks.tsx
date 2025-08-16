import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { DashboardLayout } from '../components/Dashboard/DashboardLayout';
import { showToast } from '../services/toastService';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo: string;
  assignedBy: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await apiService.getTasks();
        setTasks(response.data || []);
      } catch (error: any) {
        console.error('Failed to fetch tasks:', error);
        showToast.error('Failed to load tasks', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await apiService.updateTaskStatus(taskId, newStatus);
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
      showToast.success('Task status updated successfully');
    } catch (error: any) {
      showToast.error('Failed to update task status', error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Tasks</h1>
          <p className="text-muted-foreground">Manage and track your assigned tasks</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48 text-muted-foreground">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="text-6xl opacity-50">📋</div>
              <h3 className="text-xl font-semibold text-foreground">No tasks assigned</h3>
              <p className="text-muted-foreground">You don't have any tasks assigned at the moment.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <Card key={task.id} className="p-6 space-y-4 transition-all hover:shadow-md hover:-translate-y-1">
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-lg font-semibold text-foreground flex-1">{task.title}</h3>
                  <div className="flex gap-2 flex-wrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-md ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-md ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                </div>
                
                <p className="text-muted-foreground text-sm leading-relaxed">{task.description}</p>
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  {task.status !== 'completed' && (
                    <>
                      {task.status === 'pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleStatusChange(task.id, 'in-progress')}
                        >
                          Start Task
                        </Button>
                      )}
                      {task.status === 'in-progress' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleStatusChange(task.id, 'completed')}
                        >
                          Mark Complete
                        </Button>
                      )}
                    </>
                  )}
                  {task.status === 'completed' && (
                    <span className="text-primary font-medium text-sm">✅ Completed</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Tasks;