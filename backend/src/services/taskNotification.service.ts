import { notificationService } from './notification.service'
import { supabase } from '../config/database'

interface Task {
  id: string
  title: string
  description?: string
  assignedTo: string
  assignedBy: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled'
  dueDate?: string
  createdAt: string
  updatedAt: string
}

interface TaskComment {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: string
}

interface User {
  id: string
  fullName: string
  email: string
}

class TaskNotificationService {
  // Get user notification preferences
  async getUserPreferences(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching user preferences:', error)
        return null
      }

      // Return default preferences if none exist
      if (!data) {
        return {
          taskAssignments: true,
          taskStatusChanges: true,
          taskComments: true,
          dueDateReminders: true,
          bulkAssignments: true,
          priorityChanges: true,
          emailNotifications: true,
          pushNotifications: true,
          reminderFrequency: 'immediate',
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00'
          }
        }
      }

      return {
        taskAssignments: data.task_assignments,
        taskStatusChanges: data.task_status_changes,
        taskComments: data.task_comments,
        dueDateReminders: data.due_date_reminders,
        bulkAssignments: data.bulk_assignments,
        priorityChanges: data.priority_changes,
        emailNotifications: data.email_notifications,
        pushNotifications: data.push_notifications,
        reminderFrequency: data.reminder_frequency,
        quietHours: data.quiet_hours || {
          enabled: false,
          start: '22:00',
          end: '08:00'
        }
      }
    } catch (error) {
      console.error('Error in getUserPreferences:', error)
      return null
    }
  }

  // Update user notification preferences
  async updateUserPreferences(userId: string, preferences: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          task_assignments: preferences.taskAssignments,
          task_status_changes: preferences.taskStatusChanges,
          task_comments: preferences.taskComments,
          due_date_reminders: preferences.dueDateReminders,
          bulk_assignments: preferences.bulkAssignments,
          priority_changes: preferences.priorityChanges,
          email_notifications: preferences.emailNotifications,
          push_notifications: preferences.pushNotifications,
          reminder_frequency: preferences.reminderFrequency,
          quiet_hours: preferences.quietHours,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error updating user preferences:', error)
        return false
      }

      console.log(`Updated notification preferences for user ${userId}`)
      return true
    } catch (error) {
      console.error('Error in updateUserPreferences:', error)
      return false
    }
  }

  // Check if user should receive notification based on preferences
  async shouldSendNotification(userId: string, notificationType: string): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId)
      if (!preferences) return true // Default to sending if preferences can't be loaded

      // Check if notification type is enabled
      const typeMapping: Record<string, string> = {
        'task_assignment': 'taskAssignments',
        'task_status_change': 'taskStatusChanges',
        'task_comment': 'taskComments',
        'task_due_reminder': 'dueDateReminders',
        'bulk_task_assignment': 'bulkAssignments',
        'task_priority_change': 'priorityChanges'
      }

      const preferenceKey = typeMapping[notificationType]
      if (preferenceKey && !preferences[preferenceKey]) {
        return false
      }

      // Check quiet hours
      if (preferences.quietHours?.enabled) {
        const now = new Date()
        const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
        const startTime = preferences.quietHours.start
        const endTime = preferences.quietHours.end

        // Handle quiet hours that span midnight
        if (startTime > endTime) {
          if (currentTime >= startTime || currentTime <= endTime) {
            return false
          }
        } else {
          if (currentTime >= startTime && currentTime <= endTime) {
            return false
          }
        }
      }

      return true
    } catch (error) {
      console.error('Error checking notification preferences:', error)
      return true // Default to sending if check fails
    }
  }

  // Task Assignment Notifications
  async notifyTaskAssignment(task: Task, assignedByUser: User, assignedToUser: User): Promise<void> {
    try {
      // Check if user wants to receive this type of notification
      const shouldSend = await this.shouldSendNotification(task.assignedTo, 'task_assignment')
      if (!shouldSend) {
        console.log(`Skipping task assignment notification for user ${assignedToUser.fullName} due to preferences`)
        return
      }

      await notificationService.sendNotification(
        task.assignedTo,
        'task_assignment',
        {
          taskTitle: task.title,
          assignedBy: assignedByUser.fullName,
          dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date',
          priority: task.priority.toUpperCase()
        },
        {
          data: {
            taskId: task.id,
            type: 'task_assignment',
            url: `/tasks?taskId=${task.id}`
          },
          actions: [
            {
              action: 'view',
              title: 'View Task',
              icon: '/icons/view-icon.png'
            },
            {
              action: 'dismiss',
              title: 'Dismiss'
            }
          ],
          requireInteraction: task.priority === 'urgent'
        }
      )

      console.log(`Task assignment notification sent to ${assignedToUser.fullName} for task: ${task.title}`)
    } catch (error) {
      console.error('Failed to send task assignment notification:', error)
    }
  }

  // Task Status Change Notifications
  async notifyTaskStatusChange(
    task: Task, 
    oldStatus: string, 
    newStatus: string, 
    updatedByUser: User
  ): Promise<void> {
    try {
      // Notify the assignee if someone else updated the status
      if (updatedByUser.id !== task.assignedTo) {
        const shouldSend = await this.shouldSendNotification(task.assignedTo, 'task_status_change')
        if (shouldSend) {
          await notificationService.sendNotification(
            task.assignedTo,
            'task_status_change',
            {
              taskTitle: task.title,
              newStatus: this.formatStatus(newStatus),
              updatedBy: updatedByUser.fullName
            },
            {
              data: {
                taskId: task.id,
                type: 'task_status_change',
                oldStatus,
                newStatus,
                url: `/tasks?taskId=${task.id}`
              },
              actions: [
                {
                  action: 'view',
                  title: 'View Task'
                }
              ]
            }
          )
        }
      }

      // Notify the assigner if task is completed or cancelled
      if ((newStatus === 'completed' || newStatus === 'cancelled') && updatedByUser.id !== task.assignedBy) {
        const shouldSend = await this.shouldSendNotification(task.assignedBy, 'task_status_change')
        if (shouldSend) {
          await notificationService.sendNotification(
            task.assignedBy,
            'task_status_change',
            {
              taskTitle: task.title,
              newStatus: this.formatStatus(newStatus),
              updatedBy: updatedByUser.fullName
            },
            {
              data: {
                taskId: task.id,
                type: 'task_status_change',
                oldStatus,
                newStatus,
                url: `/tasks?taskId=${task.id}`
              }
            }
          )
        }
      }

      console.log(`Task status change notification sent for task: ${task.title} (${oldStatus} → ${newStatus})`)
    } catch (error) {
      console.error('Failed to send task status change notification:', error)
    }
  }

  // Task Comment Notifications
  async notifyTaskComment(
    task: Task,
    comment: TaskComment,
    commenterUser: User
  ): Promise<void> {
    try {
      const recipientIds: string[] = []

      // Notify assignee if they didn't make the comment
      if (commenterUser.id !== task.assignedTo) {
        const shouldSend = await this.shouldSendNotification(task.assignedTo, 'task_comment')
        if (shouldSend) {
          recipientIds.push(task.assignedTo)
        }
      }

      // Notify assigner if they didn't make the comment and aren't the assignee
      if (commenterUser.id !== task.assignedBy && task.assignedBy !== task.assignedTo) {
        const shouldSend = await this.shouldSendNotification(task.assignedBy, 'task_comment')
        if (shouldSend) {
          recipientIds.push(task.assignedBy)
        }
      }

      if (recipientIds.length > 0) {
        await notificationService.sendNotification(
          recipientIds,
          'task_comment',
          {
            taskTitle: task.title,
            commenterName: commenterUser.fullName,
            comment: comment.content.length > 100 
              ? comment.content.substring(0, 100) + '...' 
              : comment.content
          },
          {
            data: {
              taskId: task.id,
              commentId: comment.id,
              type: 'task_comment',
              url: `/tasks?taskId=${task.id}#comment-${comment.id}`
            },
            actions: [
              {
                action: 'view',
                title: 'View Comment'
              },
              {
                action: 'reply',
                title: 'Reply'
              }
            ]
          }
        )
      }

      console.log(`Task comment notification sent for task: ${task.title}`)
    } catch (error) {
      console.error('Failed to send task comment notification:', error)
    }
  }

  // Task Due Date Reminders
  async notifyTaskDueReminder(task: Task): Promise<void> {
    try {
      if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') {
        return
      }

      const shouldSend = await this.shouldSendNotification(task.assignedTo, 'task_due_reminder')
      if (!shouldSend) {
        console.log(`Skipping due date reminder for user ${task.assignedTo} due to preferences`)
        return
      }

      const dueDate = new Date(task.dueDate)
      const now = new Date()
      const timeDiff = dueDate.getTime() - now.getTime()
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))

      let reminderType = 'due_soon'
      let reminderMessage = ''

      if (daysDiff < 0) {
        reminderType = 'overdue'
        reminderMessage = `Task "${task.title}" is ${Math.abs(daysDiff)} day(s) overdue!`
      } else if (daysDiff === 0) {
        reminderMessage = `Task "${task.title}" is due today!`
      } else if (daysDiff === 1) {
        reminderMessage = `Task "${task.title}" is due tomorrow!`
      } else if (daysDiff <= 3) {
        reminderMessage = `Task "${task.title}" is due in ${daysDiff} days!`
      } else {
        return // Don't send reminders for tasks due more than 3 days away
      }

      await notificationService.sendNotification(
        task.assignedTo,
        'system_announcement',
        {
          title: reminderType === 'overdue' ? 'Overdue Task' : 'Task Due Reminder',
          message: reminderMessage,
          priority: reminderType === 'overdue' ? 'high' : 'medium'
        },
        {
          data: {
            taskId: task.id,
            type: 'task_due_reminder',
            reminderType,
            url: `/tasks?taskId=${task.id}`
          },
          requireInteraction: reminderType === 'overdue',
          actions: [
            {
              action: 'view',
              title: 'View Task'
            },
            {
              action: 'snooze',
              title: 'Remind Later'
            }
          ]
        }
      )

      console.log(`Task due reminder sent for task: ${task.title} (${reminderType})`)
    } catch (error) {
      console.error('Failed to send task due reminder:', error)
    }
  }

  // Helper method to format status for display
  private formatStatus(status: string): string {
    switch (status) {
      case 'todo': return 'To Do'
      case 'in_progress': return 'In Progress'
      case 'completed': return 'Completed'
      case 'cancelled': return 'Cancelled'
      default: return status
    }
  }

  // Batch process due date reminders (for scheduled jobs)
  async processDueDateReminders(): Promise<void> {
    try {
      console.log('Processing due date reminders...')
      
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
      
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .in('status', ['todo', 'in_progress'])
        .not('due_date', 'is', null)
        .lte('due_date', threeDaysFromNow.toISOString())
      
      if (error) {
        console.error('Error fetching tasks for due date reminders:', error)
        return
      }
      
      if (tasks && tasks.length > 0) {
        console.log(`Found ${tasks.length} tasks with upcoming due dates`)
        
        for (const task of tasks) {
          await this.notifyTaskDueReminder({
            id: task.id,
            title: task.title,
            description: task.description,
            assignedTo: task.assigned_to,
            assignedBy: task.assigned_by,
            priority: task.priority,
            status: task.status,
            dueDate: task.due_date,
            createdAt: task.created_at,
            updatedAt: task.updated_at
          })
          
          // Add small delay to avoid overwhelming the notification service
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      console.log('Due date reminders processing complete')
    } catch (error) {
      console.error('Error processing due date reminders:', error)
    }
  }
}

export const taskNotificationService = new TaskNotificationService()