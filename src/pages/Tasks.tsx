import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { DashboardLayout } from '../components/Dashboard/DashboardLayout';
import { showToast } from '../services/toastService';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import styles from './Tasks.module.css';

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
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>My Tasks</h1>
          <p>Manage and track your assigned tasks</p>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <Card className={styles.emptyState}>
            <div className={styles.emptyContent}>
              <div className={styles.emptyIcon}>📋</div>
              <h3>No tasks assigned</h3>
              <p>You don't have any tasks assigned at the moment.</p>
            </div>
          </Card>
        ) : (
          <div className={styles.tasksGrid}>
            {tasks.map((task) => (
              <Card key={task.id} className={styles.taskCard}>
                <div className={styles.taskHeader}>
                  <h3 className={styles.taskTitle}>{task.title}</h3>
                  <div className={styles.taskBadges}>
                    <span className={`${styles.badge} ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`${styles.badge} ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                </div>
                
                <p className={styles.taskDescription}>{task.description}</p>
                
                <div className={styles.taskMeta}>
                  <div className={styles.taskDates}>
                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className={styles.taskActions}>
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
                    <span className={styles.completedText}>✅ Completed</span>
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