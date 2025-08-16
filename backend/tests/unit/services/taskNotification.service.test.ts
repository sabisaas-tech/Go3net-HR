import { taskNotificationService } from '../../../src/services/taskNotification.service'
import { notificationService } from '../../../src/services/notification.service'
import { supabase } from '../../../src/config/database'

// Mock dependencies
jest.mock('../../../src/services/notification.service')
jest.mock('../../../src/config/database')

const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>
const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('TaskNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserPreferences', () => {
    it('should return user preferences when they exist', async () => {
      const mockPreferences = {
        user_id: 'user-123',
        task_assignments: true,
        task_status_changes: false,
        task_comments: true,
        due_date_reminders: true,
        bulk_assignments: false,
        priority_changes: true,
        email_notifications: true,
        push_notifications: true,
        reminder_frequency: 'immediate',
        quiet_hours: { enabled: false, start: '22:00', end: '08:00' }
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockPreferences,
              error: null
            })
          })
        })
      } as any)

      const result = await taskNotificationService.getUserPreferences('user-123')

      expect(result).toEqual({
        taskAssignments: true,
        taskStatusChanges: false,
        taskComments: true,
        dueDateReminders: true,
        bulkAssignments: false,
        priorityChanges: true,
        emailNotifications: true,
        pushNotifications: true,
        reminderFrequency: 'immediate',
        quietHours: { enabled: false, start: '22:00', end: '08:00' }
      })
    })

    it('should return default preferences when user preferences do not exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' } // No rows returned
            })
          })
        })
      } as any)

      const result = await taskNotificationService.getUserPreferences('user-123')

      expect(result).toEqual({
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
      })
    })

    it('should return null when there is a database error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'SOME_ERROR', message: 'Database error' }
            })
          })
        })
      } as any)

      const result = await taskNotificationService.getUserPreferences('user-123')

      expect(result).toBeNull()
    })
  })

  describe('updateUserPreferences', () => {
    it('should successfully update user preferences', async () => {
      const preferences = {
        taskAssignments: true,
        taskStatusChanges: false,
        taskComments: true,
        dueDateReminders: true,
        bulkAssignments: false,
        priorityChanges: true,
        emailNotifications: true,
        pushNotifications: true,
        reminderFrequency: 'hourly',
        quietHours: { enabled: true, start: '23:00', end: '07:00' }
      }

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          error: null
        })
      } as any)

      const result = await taskNotificationService.updateUserPreferences('user-123', preferences)

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_notification_preferences')
    })

    it('should return false when update fails', async () => {
      const preferences = {
        taskAssignments: true,
        taskStatusChanges: true
      }

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          error: { message: 'Update failed' }
        })
      } as any)

      const result = await taskNotificationService.updateUserPreferences('user-123', preferences)

      expect(result).toBe(false)
    })
  })

  describe('shouldSendNotification', () => {
    beforeEach(() => {
      // Mock getUserPreferences to return default preferences
      jest.spyOn(taskNotificationService, 'getUserPreferences').mockResolvedValue({
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
      })
    })

    it('should return true when notification type is enabled', async () => {
      const result = await taskNotificationService.shouldSendNotification('user-123', 'task_assignment')
      expect(result).toBe(true)
    })

    it('should return false when notification type is disabled', async () => {
      jest.spyOn(taskNotificationService, 'getUserPreferences').mockResolvedValue({
        taskAssignments: false,
        taskStatusChanges: true,
        taskComments: true,
        dueDateReminders: true,
        bulkAssignments: true,
        priorityChanges: true,
        emailNotifications: true,
        pushNotifications: true,
        reminderFrequency: 'immediate',
        quietHours: { enabled: false, start: '22:00', end: '08:00' }
      })

      const result = await taskNotificationService.shouldSendNotification('user-123', 'task_assignment')
      expect(result).toBe(false)
    })

    it('should return false during quiet hours', async () => {
      // Mock current time to be within quiet hours (23:30)
      const mockDate = new Date('2024-01-01T23:30:00Z')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)
      jest.spyOn(mockDate, 'toTimeString').mockReturnValue('23:30:00 GMT+0000 (UTC)')

      jest.spyOn(taskNotificationService, 'getUserPreferences').mockResolvedValue({
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
          enabled: true,
          start: '22:00',
          end: '08:00'
        }
      })

      const result = await taskNotificationService.shouldSendNotification('user-123', 'task_assignment')
      expect(result).toBe(false)

      // Restore Date
      jest.restoreAllMocks()
    })

    it('should return true when preferences cannot be loaded', async () => {
      jest.spyOn(taskNotificationService, 'getUserPreferences').mockResolvedValue(null)

      const result = await taskNotificationService.shouldSendNotification('user-123', 'task_assignment')
      expect(result).toBe(true)
    })
  })

  describe('notifyTaskAssignment', () => {
    const mockTask = {
      id: 'task-123',
      title: 'Test Task',
      description: 'Test Description',
      assignedTo: 'user-456',
      assignedBy: 'user-789',
      priority: 'high' as const,
      status: 'todo' as const,
      dueDate: '2024-12-31',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }

    const mockAssignedByUser = {
      id: 'user-789',
      fullName: 'John Manager',
      email: 'john@example.com'
    }

    const mockAssignedToUser = {
      id: 'user-456',
      fullName: 'Jane Employee',
      email: 'jane@example.com'
    }

    it('should send task assignment notification when user preferences allow', async () => {
      jest.spyOn(taskNotificationService, 'shouldSendNotification').mockResolvedValue(true)
      mockNotificationService.sendNotification.mockResolvedValue(undefined)

      await taskNotificationService.notifyTaskAssignment(mockTask, mockAssignedByUser, mockAssignedToUser)

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        'user-456',
        'task_assignment',
        {
          taskTitle: 'Test Task',
          assignedBy: 'John Manager',
          dueDate: '12/31/2024',
          priority: 'HIGH'
        },
        expect.objectContaining({
          data: expect.objectContaining({
            taskId: 'task-123',
            type: 'task_assignment'
          }),
          requireInteraction: false
        })
      )
    })

    it('should not send notification when user preferences disallow', async () => {
      jest.spyOn(taskNotificationService, 'shouldSendNotification').mockResolvedValue(false)

      await taskNotificationService.notifyTaskAssignment(mockTask, mockAssignedByUser, mockAssignedToUser)

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled()
    })

    it('should require interaction for urgent tasks', async () => {
      const urgentTask = { ...mockTask, priority: 'urgent' as const }
      jest.spyOn(taskNotificationService, 'shouldSendNotification').mockResolvedValue(true)
      mockNotificationService.sendNotification.mockResolvedValue(undefined)

      await taskNotificationService.notifyTaskAssignment(urgentTask, mockAssignedByUser, mockAssignedToUser)

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          requireInteraction: true
        })
      )
    })
  })

  describe('notifyTaskStatusChange', () => {
    const mockTask = {
      id: 'task-123',
      title: 'Test Task',
      description: 'Test Description',
      assignedTo: 'user-456',
      assignedBy: 'user-789',
      priority: 'medium' as const,
      status: 'completed' as const,
      dueDate: '2024-12-31',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }

    const mockUpdatedByUser = {
      id: 'user-999',
      fullName: 'Admin User',
      email: 'admin@example.com'
    }

    it('should notify assignee when someone else updates status', async () => {
      jest.spyOn(taskNotificationService, 'shouldSendNotification').mockResolvedValue(true)
      mockNotificationService.sendNotification.mockResolvedValue(undefined)

      await taskNotificationService.notifyTaskStatusChange(mockTask, 'in_progress', 'completed', mockUpdatedByUser)

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        'user-456',
        'task_status_change',
        expect.objectContaining({
          taskTitle: 'Test Task',
          newStatus: 'Completed',
          updatedBy: 'Admin User'
        }),
        expect.any(Object)
      )
    })

    it('should not notify assignee when they update their own task', async () => {
      const selfUpdatedByUser = { ...mockUpdatedByUser, id: 'user-456' }

      await taskNotificationService.notifyTaskStatusChange(mockTask, 'in_progress', 'completed', selfUpdatedByUser)

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled()
    })

    it('should notify assigner when task is completed', async () => {
      jest.spyOn(taskNotificationService, 'shouldSendNotification').mockResolvedValue(true)
      mockNotificationService.sendNotification.mockResolvedValue(undefined)

      await taskNotificationService.notifyTaskStatusChange(mockTask, 'in_progress', 'completed', mockUpdatedByUser)

      expect(mockNotificationService.sendNotification).toHaveBeenCalledTimes(2) // Both assignee and assigner
    })
  })

  describe('processDueDateReminders', () => {
    it('should process tasks with upcoming due dates', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          description: 'Description 1',
          assigned_to: 'user-1',
          assigned_by: 'user-2',
          priority: 'medium',
          status: 'todo',
          due_date: '2024-12-31',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({
                data: mockTasks,
                error: null
              })
            })
          })
        })
      } as any)

      jest.spyOn(taskNotificationService, 'notifyTaskDueReminder').mockResolvedValue(undefined)

      await taskNotificationService.processDueDateReminders()

      expect(taskNotificationService.notifyTaskDueReminder).toHaveBeenCalledWith({
        id: 'task-1',
        title: 'Task 1',
        description: 'Description 1',
        assignedTo: 'user-1',
        assignedBy: 'user-2',
        priority: 'medium',
        status: 'todo',
        dueDate: '2024-12-31',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      })
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            })
          })
        })
      } as any)

      // Should not throw an error
      await expect(taskNotificationService.processDueDateReminders()).resolves.toBeUndefined()
    })
  })
})