import { Request, Response } from 'express'
import { TaskService, CreateTaskData, UpdateTaskData, TaskSearchFilters } from '../services/task.service'
import { ResponseHandler } from '../utils/response'
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors'
import { AuthenticatedRequest } from '../middleware/permission'

export class TaskController {
  private taskService: TaskService

  constructor() {
    this.taskService = new TaskService()
  }

  async createTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const taskData: CreateTaskData = {
        title: req.body.title,
        description: req.body.description,
        assignedTo: req.body.assignedTo,
        priority: req.body.priority,
        dueDate: req.body.dueDate,
        startDate: req.body.startDate,
        estimatedHours: req.body.estimatedHours,
        tags: req.body.tags,
        dependencies: req.body.dependencies,
        projectId: req.body.projectId,
        departmentId: req.body.departmentId
      }

      const result = await this.taskService.createTask(taskData, req.user!.id)

      ResponseHandler.success(res, result.message, result.task, 201)
    } catch (error) {
      if (error instanceof ValidationError) {
        ResponseHandler.badRequest(res, error.message, error.errors)
      } else {
        ResponseHandler.error(res, 'Failed to create task')
      }
    }
  }

  async getTaskById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const task = await this.taskService.getTaskById(id)

      if (!task) {
        ResponseHandler.notFound(res, 'Task not found')
        return
      }

      ResponseHandler.success(res, 'Task retrieved successfully', task)
    } catch (error) {
      ResponseHandler.error(res, 'Failed to retrieve task')
    }
  }

  async updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const updateData: UpdateTaskData = {
        title: req.body.title,
        description: req.body.description,
        assignedTo: req.body.assignedTo,
        status: req.body.status,
        priority: req.body.priority,
        dueDate: req.body.dueDate,
        startDate: req.body.startDate,
        completedDate: req.body.completedDate,
        estimatedHours: req.body.estimatedHours,
        actualHours: req.body.actualHours,
        tags: req.body.tags,
        dependencies: req.body.dependencies,
        projectId: req.body.projectId,
        departmentId: req.body.departmentId
      }

      const result = await this.taskService.updateTask(id, updateData, req.user!.id)

      ResponseHandler.success(res, result.message, result.task)
    } catch (error) {
      if (error instanceof NotFoundError) {
        ResponseHandler.notFound(res, error.message)
      } else if (error instanceof ValidationError) {
        ResponseHandler.badRequest(res, error.message, error.errors)
      } else {
        ResponseHandler.error(res, 'Failed to update task')
      }
    }
  }

  async deleteTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const result = await this.taskService.deleteTask(id, req.user!.id)

      ResponseHandler.success(res, result.message)
    } catch (error) {
      if (error instanceof NotFoundError) {
        ResponseHandler.notFound(res, error.message)
      } else if (error instanceof ConflictError) {
        ResponseHandler.conflict(res, error.message)
      } else {
        ResponseHandler.error(res, 'Failed to delete task')
      }
    }
  }

  async searchTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters: TaskSearchFilters = {
        assignedTo: req.query.assignedTo as string,
        assignedBy: req.query.assignedBy as string,
        status: req.query.status as string,
        priority: req.query.priority as string,
        departmentId: req.query.departmentId as string,
        projectId: req.query.projectId as string,
        dueDateFrom: req.query.dueDateFrom as string,
        dueDateTo: req.query.dueDateTo as string,
        search: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      }

      const result = await this.taskService.searchTasks(filters)

      ResponseHandler.success(res, result.message, {
        tasks: result.tasks,
        total: result.total,
        limit: filters.limit,
        offset: filters.offset
      })
    } catch (error) {
      ResponseHandler.error(res, 'Failed to search tasks')
    }
  }

  async getMyTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status } = req.query
      const tasks = await this.taskService.getTasksByAssignee(
        req.user!.id, 
        status as string
      )

      ResponseHandler.success(res, 'Tasks retrieved successfully', tasks)
    } catch (error) {
      ResponseHandler.error(res, 'Failed to retrieve tasks')
    }
  }

  async getTasksCreatedByMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status } = req.query
      const tasks = await this.taskService.getTasksByCreator(
        req.user!.id, 
        status as string
      )

      ResponseHandler.success(res, 'Tasks retrieved successfully', tasks)
    } catch (error) {
      ResponseHandler.error(res, 'Failed to retrieve tasks')
    }
  }

  async getOverdueTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tasks = await this.taskService.getOverdueTasks()

      ResponseHandler.success(res, 'Overdue tasks retrieved successfully', tasks)
    } catch (error) {
      ResponseHandler.error(res, 'Failed to retrieve overdue tasks')
    }
  }

  async getTaskStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters = {
        assignedTo: req.query.assignedTo as string,
        departmentId: req.query.departmentId as string,
        projectId: req.query.projectId as string
      }

      const stats = await this.taskService.getTaskStatistics(filters)

      ResponseHandler.success(res, 'Task statistics retrieved successfully', stats)
    } catch (error) {
      ResponseHandler.error(res, 'Failed to retrieve task statistics')
    }
  }

  async addTaskComment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { comment } = req.body

      if (!comment || !comment.trim()) {
        ResponseHandler.badRequest(res, 'Comment is required')
        return
      }

      const result = await this.taskService.addTaskComment(id, comment.trim(), req.user!.id)

      ResponseHandler.success(res, result.message, result.comment, 201)
    } catch (error) {
      if (error instanceof NotFoundError) {
        ResponseHandler.notFound(res, error.message)
      } else {
        ResponseHandler.error(res, 'Failed to add comment')
      }
    }
  }

  async assignTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { assignedTo } = req.body

      if (!assignedTo) {
        ResponseHandler.badRequest(res, 'Assignee is required')
        return
      }

      const result = await this.taskService.updateTask(
        id, 
        { assignedTo }, 
        req.user!.id
      )

      ResponseHandler.success(res, 'Task assigned successfully', result.task)
    } catch (error) {
      if (error instanceof NotFoundError) {
        ResponseHandler.notFound(res, error.message)
      } else if (error instanceof ValidationError) {
        ResponseHandler.badRequest(res, error.message, error.errors)
      } else {
        ResponseHandler.error(res, 'Failed to assign task')
      }
    }
  }

  async updateTaskStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { status, completionNotes } = req.body

      if (!status) {
        ResponseHandler.badRequest(res, 'Status is required')
        return
      }

      const updateData: UpdateTaskData = { status }
      
      // Add completion notes if task is being completed
      if (status === 'completed' && completionNotes) {
        updateData.actualHours = req.body.actualHours
      }

      const result = await this.taskService.updateTask(id, updateData, req.user!.id)

      ResponseHandler.success(res, 'Task status updated successfully', result.task)
    } catch (error) {
      if (error instanceof NotFoundError) {
        ResponseHandler.notFound(res, error.message)
      } else if (error instanceof ValidationError) {
        ResponseHandler.badRequest(res, error.message, error.errors)
      } else {
        ResponseHandler.error(res, 'Failed to update task status')
      }
    }
  }
}