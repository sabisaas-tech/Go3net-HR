import request from 'supertest'
import { app } from '../../src/server'
import { supabase } from '../../src/config/database'
import { taskNotificationService } from '../../src/services/taskNotification.service'
import jwt from 'jsonwebtoken'

// Mock dependencies
jest.mock('../../src/config/database')
jest.mock('../../src/services/taskNotification.service')

const mockSupabase = supabase as jest.Mocked<typeof supabase>
const mockTaskNotificationService = taskNotificationService as jest.Mocked<typeof taskNotificationService>

describe('Task Notification Integration Tests', () => {
  let managerToken: string
  let employeeToken: string
  let hrAdminToken: string

  beforeAll(() => {
    const secret = process.env.JWT_SECRET || 'test-secret'
    
    managerToken = jwt.sign(
      { id: 'manager-123', role: 'manager', email: 'manager@example.com', fullName: 'Test Manager' },
      secret,
      { expiresIn: '1h' }
    )
    
    employeeToken = jwt.sign(
      { id: 'employee-123', role: 'employee', email: 'employee@example.com', fullName: 'Test Employee' },
      secret,
      { expiresIn: '1h' }
    )
    
    hrAdminToken = jwt.sign(
      { id: 'admin-123', role: 'hr-admin', email: 'admin@example.com', fullName: 'Test Admin' },
      secret,
      { expiresIn: '1h' }
    )
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Task Creation with Notifications', () => {
    it('should send notification when creating a task', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        assignedTo: 'employee-123',
        priority: 'high',
        dueDate: '2024-12-31'
      }

      const mockTask = {
        id: 'task-123',
        title: 'Test Task',
        description: 'Test Description',
        assigned_to: 'employee-123',
        assigned_by: 'manager-123',
        priority: 'high',
        status: 'todo',
        due_date: '2024-12-31',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        assigned_to_user: {
          id: 'employee-123',
          full_name: 'Test Employee',
          email: 'employee@example.com'
        },
        assigned_by_user: {
          id: 'manager-123',
          full_name: 'Test Manager',
          email: 'manager@example.com'
        }
      }

      // Mock task creation
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: mockTask,
            error: null
          })
        })
      } as any)

      mockTaskNotificationService.notifyTaskAssignment.mockResolvedValue(undefined)

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(taskData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(mockTaskNotificationService.notifyTaskAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-123',
          title: 'Test Task',
          assignedTo: 'employee-123',
          assignedBy: 'manager-123'
        }),
        expect.objectContaining({
          id: 'manager-123',
          fullName: 'Test Manager'
        }),
        expect.objectContaining({
          id: 'employee-123',
          fullName: 'Test Employee'
        })
      )
    })

    it('should not send notification when assigning task to self', async () => {
      const taskData = {
        title: 'Self Assigned Task',
        description: 'Task assigned to self',
        assignedTo: 'manager-123',
        priority: 'medium'
      }

      const mockTask = {
        id: 'task-124',
        assigned_to: 'manager-123',
        assigned_by: 'manager-123'
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: mockTask,
            error: null
          })
        })
      } as any)

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(taskData)
        .expect(201)

      expect(mockTaskNotificationService.notifyTaskAssignment).not.toHaveBeenCalled()
    })
  })

  describe('Task Status Updates with Notifications', () => {
    it('should send notification when task status is updated', async () => {
      const taskId = 'task-123'
      const updateData = { status: 'completed' }

      const existingTask = {
        id: taskId,
        title: 'Test Task',
        assigned_to: 'employee-123',
        assigned_by: 'manager-123',
        status: 'in_progress',
        priority: 'medium'
      }

      const updatedTask = {
        ...existingTask,
        status: 'completed',
        assigned_to_user: {
          id: 'employee-123',
          full_name: 'Test Employee',
          email: 'employee@example.com'
        },
        assigned_by_user: {
          id: 'manager-123',
          full_name: 'Test Manager',
          email: 'manager@example.com'
        }
      }

      // Mock existing task fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingTask,
              error: null
            })
          })
        })
      } as any)

      // Mock task update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: updatedTask,
              error: null
            })
          })
        })
      } as any)

      mockTaskNotificationService.notifyTaskStatusChange.mockResolvedValue(undefined)

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${hrAdminToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(mockTaskNotificationService.notifyTaskStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          id: taskId,
          status: 'completed'
        }),
        'in_progress',
        'completed',
        expect.objectContaining({
          id: 'admin-123',
          fullName: 'Test Admin'
        })
      )
    })

    it('should send priority change notification', async () => {
      const taskId = 'task-123'
      const updateData = { priority: 'urgent' }

      const existingTask = {
        id: taskId,
        priority: 'medium',
        assigned_to: 'employee-123'
      }

      const updatedTask = {
        ...existingTask,
        priority: 'urgent'
      }

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingTask,
              error: null
            })
          })
        })
      } as any)

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: updatedTask,
              error: null
            })
          })
        })
      } as any)

      mockTaskNotificationService.notifyTaskPriorityChange.mockResolvedValue(undefined)

      await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData)
        .expect(200)

      expect(mockTaskNotificationService.notifyTaskPriorityChange).toHaveBeenCalledWith(
        expect.objectContaining({
          id: taskId,
          priority: 'urgent'
        }),
        'medium',
        'urgent',
        expect.objectContaining({
          id: 'manager-123'
        })
      )
    })
  })

  describe('Task Comments with Notifications', () => {
    it('should send notification when adding a comment', async () => {
      const taskId = 'task-123'
      const commentData = { content: 'This is a test comment' }

      const mockTask = {
        id: taskId,
        title: 'Test Task',
        assigned_to: 'employee-123',
        assigned_by: 'manager-123',
        priority: 'medium',
        status: 'in_progress',
        assigned_to_user: {
          full_name: 'Test Employee',
          email: 'employee@example.com'
        },
        assigned_by_user: {
          full_name: 'Test Manager',
          email: 'manager@example.com'
        }
      }

      const mockComment = {
        id: 'comment-123',
        task_id: taskId,
        user_id: 'admin-123',
        content: 'This is a test comment',
        created_at: '2024-01-01T00:00:00Z',
        user: {
          full_name: 'Test Admin',
          email: 'admin@example.com'
        }
      }

      // Mock task fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTask,
              error: null
            })
          })
        })
      } as any)

      // Mock comment creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: mockComment,
            error: null
          })
        })
      } as any)

      mockTaskNotificationService.notifyTaskComment.mockResolvedValue(undefined)

      const response = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${hrAdminToken}`)
        .send(commentData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(mockTaskNotificationService.notifyTaskComment).toHaveBeenCalledWith(
        expect.objectContaining({
          id: taskId,
          title: 'Test Task'
        }),
        expect.objectContaining({
          id: 'comment-123',
          content: 'This is a test comment'
        }),
        expect.objectContaining({
          id: 'admin-123',
          fullName: 'Test Admin'
        })
      )
    })

    it('should handle comment notification errors gracefully', async () => {
      const taskId = 'task-123'
      const commentData = { content: 'Test comment' }

      const mockTask = {
        id: taskId,
        title: 'Test Task',
        assigned_to: 'employee-123',
        assigned_by: 'manager-123'
      }

      const mockComment = {
        id: 'comment-123',
        task_id: taskId,
        user_id: 'admin-123',
        content: 'Test comment'
      }

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTask,
              error: null
            })
          })
        })
      } as any)

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: mockComment,
            error: null
          })
        })
      } as any)

      // Mock notification failure
      mockTaskNotificationService.notifyTaskComment.mockRejectedValue(new Error('Notification failed'))

      // Comment should still be created successfully
      const response = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${hrAdminToken}`)
        .send(commentData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Comment added successfully')
    })
  })

  describe('Bulk Task Operations', () => {
    it('should handle bulk task assignment notifications', async () => {
      const bulkTaskData = {
        tasks: [
          { title: 'Task 1', assignedTo: 'employee-123', priority: 'medium' },
          { title: 'Task 2', assignedTo: 'employee-123', priority: 'high' }
        ]
      }

      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          assigned_to: 'employee-123',
          assigned_by: 'manager-123'
        },
        {
          id: 'task-2',
          title: 'Task 2',
          assigned_to: 'employee-123',
          assigned_by: 'manager-123'
        }
      ]

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: mockTasks,
            error: null
          })
        })
      } as any)

      mockTaskNotificationService.notifyBulkTaskAssignment.mockResolvedValue(undefined)

      const response = await request(app)
        .post('/api/tasks/bulk')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(bulkTaskData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(mockTaskNotificationService.notifyBulkTaskAssignment).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Task 1' }),
          expect.objectContaining({ title: 'Task 2' })
        ]),
        expect.objectContaining({ id: 'manager-123' }),
        expect.objectContaining({ id: 'employee-123' })
      )
    })
  })

  describe('Due Date Reminder Processing', () => {
    it('should process due date reminders', async () => {
      mockTaskNotificationService.processDueDateReminders.mockResolvedValue(undefined)

      const response = await request(app)
        .post('/api/tasks/process-reminders')
        .set('Authorization', `Bearer ${hrAdminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(mockTaskNotificationService.processDueDateReminders).toHaveBeenCalled()
    })

    it('should require admin permissions for processing reminders', async () => {
      const response = await request(app)
        .post('/api/tasks/process-reminders')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Insufficient permissions')
    })
  })

  describe('Error Handling', () => {
    it('should handle notification service errors gracefully', async () => {
      const taskData = {
        title: 'Test Task',
        assignedTo: 'employee-123',
        priority: 'high'
      }

      const mockTask = {
        id: 'task-123',
        assigned_to: 'employee-123',
        assigned_by: 'manager-123'
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: mockTask,
            error: null
          })
        })
      } as any)

      // Mock notification failure
      mockTaskNotificationService.notifyTaskAssignment.mockRejectedValue(new Error('Notification service down'))

      // Task creation should still succeed
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(taskData)
        .expect(201)

      expect(response.body.success).toBe(true)
    })

    it('should handle database errors in notification preferences', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any)

      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Internal server error')
    })
  })
})