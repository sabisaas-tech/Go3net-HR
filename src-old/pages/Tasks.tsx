import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Dashboard/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Plus, Calendar, User } from 'lucide-react';
import styles from './Tasks.module.css';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  assignedTo: string;
  createdBy: string;
}

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await apiService.getTasks();
      setTasks(response.data || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout 
      userRole={user.role} 
      userName={`${user.firstName} ${user.lastName}`}
      userEmail={user.email}
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Tasks</h1>
          {user.permissions.includes('tasks.create') && (
            <Button className={styles.addButton}>
              <Plus size={18} />
              Add Task
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className={styles.loading}>Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <Card className={styles.emptyState}>
            <h3>No tasks found</h3>
            <p>You don't have any tasks assigned yet.</p>
          </Card>
        ) : (
          <div className={styles.taskGrid}>
            {tasks.map(task => (
              <Card key={task.id} className={styles.taskCard}>
                <div className={styles.taskHeader}>
                  <h3>{task.title}</h3>
                  <div className={styles.badges}>
                    <Badge className={`${styles.badge} ${getStatusColor(task.status)}`}>
                      {task.status}
                    </Badge>
                    <Badge className={`${styles.badge} ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </Badge>
                  </div>
                </div>
                
                <p className={styles.description}>{task.description}</p>
                
                <div className={styles.taskMeta}>
                  <div className={styles.metaItem}>
                    <Calendar size={16} />
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.metaItem}>
                    <User size={16} />
                    <span>Assigned by: {task.createdBy}</span>
                  </div>
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