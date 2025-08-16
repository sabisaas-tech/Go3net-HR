import { Request, Response } from 'express'
import { TaskController } from '../../../src/controllers/task.controller'
import { TaskService } from '../../../src/services/task.service'
import { ValidationError, NotFoundError, ConflictError } from '../../../src/utils/errors'
import { AuthenticatedRequest } from '../../../src/middleware/permission'

jest.mock('../../../src/services/task.service')

describe('TaskController', () => {
  let taskController: TaskController
  let mockTaskService: jest.Mocked<TaskService>
  let mockRequest: Partial<AuthenticatedRequest>
  let mockResponse: Partial<Response>

  beforeEach(() => {
    taskController = new TaskController()
    mockTaskService = new TaskService() as jest.Mocked<TaskService>
    ;(taskController as any).taskService = mockTaskService

    mockRequest = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'manager'
      },
      body: {},
      params: {},
      query: {}
    }

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }

    jest.clearAllMocks()
  })

  describe('createTask', () => {
    it('should create task successfully', async () => {
      const taskData = {
        title: 'Test task',
        description: 'Test description',
        assignedTo: 'emp-123',
        priority: 'high'
      }

      const mockResult = {
        success: true,
        message: 'Task created successfully',
        task: {
          id: 'task-123',
          title: 'Test task',
          assignedBy: 'user-123',
          status: 'pending' as const,
          priority: 'high' as const,
          createdBy: 'user-123',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      }

      mockRequest.body = taskData
      mockTaskService.createTask.mockResolvedValue(mockResult)

      await taskController.createTask(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskService.createTask).toHaveBeenCalledWith(taskData, 'user-123')
      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task created successfully',
        data: mockResult.task
      })
    })

    it('should handle validation errors', async () => {
      const validationError = new ValidationError('Validation failed', ['Title is required'])
      mockTaskService.createTask.mockRejectedValue(validationError)

      await taskController.createTask(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: ['Title is required']
      })
    })

    it('should handle general errors', async () => {
      mockTaskService.createTask.mockRejectedValue(new Error('Database error'))

      await taskController.createTask(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to create task'
      })
    })
  })

  describe('getTaskById', () => {
    it('should retrieve task successfully', async () => {
      const mockTask = {
        id: 'task-123',
        title: 'Test task',
        status: 'pending',
        assignedTo: 'emp-123'
      }

      mockRequest.params = { id: 'task-123' }
      mockTaskService.getTaskById.mockResolvedValue(mockTask as any)

      await taskController.getTaskById(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskService.getTaskById).toHaveBeenCalledWith('task-123')
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task retrieved successfully',
        data: mockTask
      })
    })

    it('should return 404 when task not found', async () => {
      mockRequest.params = { id: 'nonexistent' }
      mockTaskService.getTaskById.mockResolvedValue(null)

      await taskController.getTaskById(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Task not found'
      })
    })

    it('should handle service errors', async () => {
      mockRequest.params = { id: 'task-123' }
      mockTaskService.getTaskById.mockRejectedValue(new Error('Database error'))

      await taskController.getTaskById(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve task'
      })
    })
  })

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const updateData = {
        title: 'Updated task',
        status: 'in_progress'
      }

      const mockResult = {
        success: true,
        message: 'Task updated successfully',
        task: {
          id: 'task-123',
          title: 'Updated task',
          assignedBy: 'user-123',
          status: 'in_progress' as const,
          priority: 'medium' as const,
          createdBy: 'user-123',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      }

      mockRequest.params = { id: 'task-123' }
      mockRequest.body = updateData
      mockTaskService.updateTask.mockResolvedValue(mockResult)

      await taskController.updateTask(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskService.updateTask).toHaveBeenCalledWith('task-123', updateData, 'user-123')
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task updated successfully',
        data: mockResult.task
      })
    })

    it('should handle not found errors', async () => {
      const notFoundError = new NotFoundError('Task not found')
      mockRequest.params = { id: 'nonexistent' }
      mockTaskService.updateTask.mockRejectedValue(notFoundError)

      await taskController.updateTask(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Task not found'
      })
    })
  })

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      const mockResult = {
        success: true,
        message: 'Task deleted successfully'
      }

      mockRequest.params = { id: 'task-123' }
      mockTaskService.deleteTask.mockResolvedValue(mockResult)

      await taskController.deleteTask(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskService.deleteTask).toHaveBeenCalledWith('task-123', 'user-123')
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task deleted successfully'
      })
    })

    it('should handle conflict errors', async () => {
      const conflictError = new ConflictError('Cannot delete completed tasks')
      mockRequest.params = { id: 'task-123' }
      mockTaskService.deleteTask.mockRejectedValue(conflictError)

      await taskController.deleteTask(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(409)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot delete completed tasks'
      })
    })
  })

  describe('searchTasks', () => {
    it('should search tasks with filters', async () => {
      const mockResult = {
        success: true,
        message: 'Tasks retrieved successfully',
        tasks: [
          { 
            id: 'task-1', 
            title: 'Task 1',
            assignedBy: 'user-123',
            status: 'pending' as const,
            priority: 'medium' as const,
            createdBy: 'user-123',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z'
          },
          { 
            id: 'task-2', 
            title: 'Task 2',
            assignedBy: 'user-123',
            status: 'pending' as const,
            priority: 'medium' as const,
            createdBy: 'user-123',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z'
          }
        ],
        total: 2
      }

      mockRequest.query = {
        assignedTo: 'emp-123',
        status: 'pending',
        limit: '10',
        offset: '0'
      }

      mockTaskService.searchTasks.mockResolvedValue(mockResult)

      await taskController.searchTasks(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskService.searchTasks).toHaveBeenCalledWith({
        assignedTo: 'emp-123',
        status: 'pending',
        priority: undefined,
        departmentId: undefined,
        projectId: undefined,
        dueDateFrom: undefined,
        dueDateTo: undefined,
        search: undefined,
        tags: undefined,
        limit: 10,
        offset: 0,
        sortBy: undefined,
        sortOrder: undefined
      })

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Tasks retrieved successfully',
        data: {
          tasks: mockResult.tasks,
          total: 2,
          limit: 10,
          offset: 0
        }
      })
    })

    it('should handle tags parameter', async () => {
      mockRequest.query = {
        tags: 'urgent,important'
      }

      const mockResult = {
        success: true,
        message: 'Tasks retrieved successfully',
        tasks: [],
        total: 0
      }

      mockTaskService.searchTasks.mockResolvedValue(mockResult)

      await taskController.searchTasks(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskService.searchTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['urgent', 'important']
        })
      )
    })
  })

  describe('getMyTasks', () => {
    it('should return tasks assigned to current user', async () => {
      const mockTasks = [
        { id: 'task-1', title: 'My Task 1', assignedTo: 'user-123' },
        { id: 'task-2', title: 'My Task 2', assignedTo: 'user-123' }
      ]

      mockTaskService.getTasksByAssignee.mockResolvedValue(mockTasks as any)

      await taskController.getMyTasks(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskService.getTasksByAssignee).toHaveBeenCalledWith('user-123', undefined)
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Tasks retrieved successfully',
        data: mockTasks
      })
    })

    it('should filter by status when provided', async () => {
      mockRequest.query = { status: 'completed' }
      mockTaskService.getTasksByAssignee.mockResolvedValue([])

      await taskController.getMyTasks(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskService.getTasksByAssignee).toHaveBeenCalledWith('user-123', 'completed')
    })
  })

  describe('addTaskComment', () => {
    it('should add comment successfully', async () => {
      const mockResult = {
        success: true,
        message: 'Comment added successfully',
        comment: {
          id: 'comment-123',
          taskId: 'task-123',
          userId: 'user-123',
          comment: 'Test comment',
          createdAt: '2023-01-01T00:00:00Z'
        }
      }

      mockRequest.params = { id: 'task-123' }
      mockRequest.body = { comment: 'Test comment' }
      mockTaskService.addTaskComment.mockResolvedValue(mockResult)

      await taskController.addTaskComment(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskService.addTaskComment).toHaveBeenCalledWith('task-123', 'Test comment', 'user-123')
      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Comment added successfully',
        data: mockResult.comment
      })
    })

    it('should reject empty comment', async () => {
      mockRequest.params = { id: 'task-123' }
      mockRequest.body = { comment: '' }

      await taskController.addTaskComment(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskService.addTaskComment).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Comment is required'
      })
    })

    it('should handle not found errors', async () => {
      const notFoundError = new NotFoundError('Task not found')
      mockRequest.params = { id: 'nonexistent' }
      mockRequest.body = { comment: 'Test comment' }
      mockTaskService.addTaskComment.mockRejectedValue(notFoundError)

      await taskController.addTaskComment(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Task not found'
      })
    })
  })

  describe('assignTask', () => {
    it('should assign task successfully', async () => {
      const mockResult = {
        success: true,
        message: 'Task updated successfully',
        task: {
          id: 'task-123',
          title: 'Test task',
          assignedTo: 'emp-123',
          assignedBy: 'user-123',
          status: 'pending' as const,
          priority: 'medium' as const,
          createdBy: 'user-123',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      }

      mockRequest.params = { id: 'task-123' }
      mockRequest.body = { assignedTo: 'emp-123' }
      mockTaskService.updateTask.mockResolvedValue(mockResult)

      await taskController.assignTask(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskService.updateTask).toHaveBeenCalledWith('task-123', { assignedTo: 'emp-123' }, 'user-123')
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task assigned successfully',
        data: mockResult.task
      })
    })

    it('should reject assignment without assignee', async () => {
      mockRequest.params = { id: 'task-123' }
      mockRequest.body = {}

      await taskController.assignTask(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskService.updateTask).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Assignee is required'
      })
    })
  })

  describe('updateTaskStatus', () => {
    it('should update task status successfully', async () => {
      const mockResult = {
        success: true,
        message: 'Task updated successfully',
        task: {
          id: 'task-123',
          title: 'Test task',
          assignedBy: 'user-123',
          status: 'completed' as const,
          priority: 'medium' as const,
          createdBy: 'user-123',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      }

      mockRequest.params = { id: 'task-123' }
      mockRequest.body = { status: 'completed', actualHours: 8 }
      mockTaskService.updateTask.mockResolvedValue(mockResult)

      await taskController.updateTaskStatus(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskService.updateTask).toHaveBeenCalledWith('task-123', { status: 'completed' }, 'user-123')
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Task status updated successfully',
        data: mockResult.task
      })
    })

    it('should reject status update without status', async () => {
      mockRequest.params = { id: 'task-123' }
      mockRequest.body = {}

      await taskController.updateTaskStatus(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskService.updateTask).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status is required'
      })
    })
  })
})