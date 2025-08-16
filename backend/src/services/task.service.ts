import { supabase } from '../config/database'
import { NotFoundError, ConflictError, ValidationError, AuthorizationError } from '../utils/errors'

export interface Task {
  id: string
  title: string
  description?: string
  assignedTo?: string
  assignedBy: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  startDate?: string
  completedDate?: string
  estimatedHours?: number
  actualHours?: number
  tags?: string[]
  attachments?: string[]
  comments?: TaskComment[]
  dependencies?: string[]
  projectId?: string
  departmentId?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy?: string
}

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  comment: string
  createdAt: string
  updatedAt?: string
}

export interface CreateTaskData {
  title: string
  description?: string
  assignedTo?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  startDate?: string
  estimatedHours?: number
  tags?: string[]
  dependencies?: string[]
  projectId?: string
  departmentId?: string
}

export interface UpdateTaskData {
  title?: string
  description?: string
  assignedTo?: string
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  startDate?: string
  completedDate?: string
  estimatedHours?: number
  actualHours?: number
  tags?: string[]
  dependencies?: string[]
  projectId?: string
  departmentId?: string
}

export interface TaskSearchFilters {
  assignedTo?: string
  assignedBy?: string
  status?: string
  priority?: string
  departmentId?: string
  projectId?: string
  dueDateFrom?: string
  dueDateTo?: string
  search?: string
  tags?: string[]
  limit?: number
  offset?: number
  sortBy?: 'created_at' | 'due_date' | 'priority' | 'status' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export interface TaskResult {
  success: boolean
  message: string
  task?: Task
  tasks?: Task[]
  total?: number
  comment?: TaskComment
}

export interface TaskStatistics {
  total: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
  onHold: number
  overdue: number
  dueToday: number
  dueThisWeek: number
  byPriority: {
    low: number
    medium: number
    high: number
    urgent: number
  }
  byAssignee: Record<string, number>
  averageCompletionTime: number
}

export class TaskService {
  async createTask(data: CreateTaskData, createdBy: string): Promise<TaskResult> {
    try {
      // Validate required fields
      this.validateTaskData(data)

      // Validate dependencies if provided
      if (data.dependencies && data.dependencies.length > 0) {
        await this.validateTaskDependencies(data.dependencies)
      }

      // Validate assignee if provided
      if (data.assignedTo) {
        await this.validateAssignee(data.assignedTo)
      }

      // Set default values
      const taskData = {
        title: data.title,
        description: data.description,
        assigned_to: data.assignedTo,
        assigned_by: createdBy,
        status: 'pending' as const,
        priority: data.priority || 'medium' as const,
        due_date: data.dueDate,
        start_date: data.startDate,
        estimated_hours: data.estimatedHours,
        tags: data.tags || [],
        dependencies: data.dependencies || [],
        project_id: data.projectId,
        department_id: data.departmentId,
        created_by: createdBy
      }

      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()

      if (error) throw error

      const task = this.mapDatabaseToTask(newTask)

      return {
        success: true,
        message: 'Task created successfully',
        task
      }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        throw error
      }
      throw new Error('Failed to create task')
    }
  }

  async getTaskById(id: string): Promise<Task | null> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!assigned_to(id, full_name, email),
          assigner:users!assigned_by(id, full_name, email),
          creator:users!created_by(id, full_name, email),
          comments:task_comments(*)
        `)
        .eq('id', id)
        .single()

      if (error || !data) return null

      return this.mapDatabaseToTask(data)
    } catch (error) {
      return null
    }
  }

  async updateTask(id: string, data: UpdateTaskData, updatedBy: string): Promise<TaskResult> {
    try {
      // Check if task exists
      const existingTask = await this.getTaskById(id)
      if (!existingTask) {
        throw new NotFoundError('Task not found')
      }

      // Validate assignee if being updated
      if (data.assignedTo) {
        await this.validateAssignee(data.assignedTo)
      }

      // Validate dependencies if being updated
      if (data.dependencies && data.dependencies.length > 0) {
        await this.validateTaskDependencies(data.dependencies, id)
      }

      // Handle status changes
      const updateData: any = {
        ...data,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      }

      // Set completion date if status is being changed to completed
      if (data.status === 'completed' && existingTask.status !== 'completed') {
        updateData.completed_date = new Date().toISOString()
      }

      // Clear completion date if status is being changed from completed
      if (data.status && data.status !== 'completed' && existingTask.status === 'completed') {
        updateData.completed_date = null
      }

      const { data: updatedTask, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          assignee:users!assigned_to(id, full_name, email),
          assigner:users!assigned_by(id, full_name, email),
          creator:users!created_by(id, full_name, email),
          comments:task_comments(*)
        `)
        .single()

      if (error) throw error

      const task = this.mapDatabaseToTask(updatedTask)

      return {
        success: true,
        message: 'Task updated successfully',
        task
      }
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error
      }
      throw new Error('Failed to update task')
    }
  }

  async deleteTask(id: string, deletedBy: string): Promise<TaskResult> {
    try {
      // Check if task exists
      const existingTask = await this.getTaskById(id)
      if (!existingTask) {
        throw new NotFoundError('Task not found')
      }

      // Check if task can be deleted (not completed or has dependencies)
      if (existingTask.status === 'completed') {
        throw new ConflictError('Cannot delete completed tasks')
      }

      // Check for dependent tasks
      const dependentTasks = await this.getTasksWithDependency(id)
      if (dependentTasks.length > 0) {
        throw new ConflictError('Cannot delete task with dependent tasks')
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error

      return {
        success: true,
        message: 'Task deleted successfully'
      }
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error
      }
      throw new Error('Failed to delete task')
    }
  }

  async searchTasks(filters: TaskSearchFilters): Promise<TaskResult> {
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!assigned_to(id, full_name, email),
          assigner:users!assigned_by(id, full_name, email),
          creator:users!created_by(id, full_name, email)
        `, { count: 'exact' })

      // Apply filters
      if (filters.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo)
      }

      if (filters.assignedBy) {
        query = query.eq('assigned_by', filters.assignedBy)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.priority) {
        query = query.eq('priority', filters.priority)
      }

      if (filters.departmentId) {
        query = query.eq('department_id', filters.departmentId)
      }

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      if (filters.dueDateFrom) {
        query = query.gte('due_date', filters.dueDateFrom)
      }

      if (filters.dueDateTo) {
        query = query.lte('due_date', filters.dueDateTo)
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags)
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'created_at'
      const sortOrder = filters.sortOrder || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error, count } = await query

      if (error) throw error

      const tasks = data?.map(task => this.mapDatabaseToTask(task)) || []

      return {
        success: true,
        message: 'Tasks retrieved successfully',
        tasks,
        total: count || 0
      }
    } catch (error) {
      throw new Error('Failed to search tasks')
    }
  }

  async getTasksByAssignee(assigneeId: string, status?: string): Promise<Task[]> {
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!assigned_to(id, full_name, email),
          assigner:users!assigned_by(id, full_name, email),
          creator:users!created_by(id, full_name, email)
        `)
        .eq('assigned_to', assigneeId)

      if (status) {
        query = query.eq('status', status)
      }

      query = query.order('due_date', { ascending: true, nullsFirst: false })

      const { data, error } = await query

      if (error) throw error

      return data?.map(task => this.mapDatabaseToTask(task)) || []
    } catch (error) {
      return []
    }
  }

  async getTasksByCreator(creatorId: string, status?: string): Promise<Task[]> {
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!assigned_to(id, full_name, email),
          assigner:users!assigned_by(id, full_name, email),
          creator:users!created_by(id, full_name, email)
        `)
        .eq('created_by', creatorId)

      if (status) {
        query = query.eq('status', status)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      return data?.map(task => this.mapDatabaseToTask(task)) || []
    } catch (error) {
      return []
    }
  }

  async getOverdueTasks(): Promise<Task[]> {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!assigned_to(id, full_name, email),
          assigner:users!assigned_by(id, full_name, email),
          creator:users!created_by(id, full_name, email)
        `)
        .lt('due_date', today)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })

      if (error) throw error

      return data?.map(task => this.mapDatabaseToTask(task)) || []
    } catch (error) {
      return []
    }
  }

  async getTaskStatistics(filters?: { assignedTo?: string, departmentId?: string, projectId?: string }): Promise<TaskStatistics> {
    try {
      let query = supabase.from('tasks').select('*')

      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo)
      }

      if (filters?.departmentId) {
        query = query.eq('department_id', filters.departmentId)
      }

      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      const { data: tasks, error } = await query

      if (error) throw error

      const today = new Date()
      const oneWeekFromNow = new Date()
      oneWeekFromNow.setDate(today.getDate() + 7)

      const stats: TaskStatistics = {
        total: tasks?.length || 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        onHold: 0,
        overdue: 0,
        dueToday: 0,
        dueThisWeek: 0,
        byPriority: {
          low: 0,
          medium: 0,
          high: 0,
          urgent: 0
        },
        byAssignee: {},
        averageCompletionTime: 0
      }

      let totalCompletionTime = 0
      let completedTasksCount = 0

      tasks?.forEach(task => {
        // Status counts
        switch (task.status) {
          case 'pending':
            stats.pending++
            break
          case 'in_progress':
            stats.inProgress++
            break
          case 'completed':
            stats.completed++
            break
          case 'cancelled':
            stats.cancelled++
            break
          case 'on_hold':
            stats.onHold++
            break
        }

        // Priority counts
        stats.byPriority[task.priority as keyof typeof stats.byPriority]++

        // Assignee counts
        if (task.assigned_to) {
          stats.byAssignee[task.assigned_to] = (stats.byAssignee[task.assigned_to] || 0) + 1
        }

        // Due date analysis
        if (task.due_date) {
          const dueDate = new Date(task.due_date)
          const todayStr = today.toISOString().split('T')[0]
          const dueDateStr = dueDate.toISOString().split('T')[0]

          if (dueDate < today && ['pending', 'in_progress'].includes(task.status)) {
            stats.overdue++
          }

          if (dueDateStr === todayStr) {
            stats.dueToday++
          }

          if (dueDate <= oneWeekFromNow && dueDate >= today) {
            stats.dueThisWeek++
          }
        }

        // Completion time calculation
        if (task.status === 'completed' && task.created_at && task.completed_date) {
          const createdDate = new Date(task.created_at)
          const completedDate = new Date(task.completed_date)
          const completionTime = completedDate.getTime() - createdDate.getTime()
          totalCompletionTime += completionTime
          completedTasksCount++
        }
      })

      // Calculate average completion time in days
      if (completedTasksCount > 0) {
        stats.averageCompletionTime = Math.round(
          (totalCompletionTime / completedTasksCount) / (1000 * 60 * 60 * 24) * 100
        ) / 100
      }

      return stats
    } catch (error) {
      throw new Error('Failed to get task statistics')
    }
  }

  async addTaskComment(taskId: string, comment: string, userId: string): Promise<TaskResult> {
    try {
      // Verify task exists
      const task = await this.getTaskById(taskId)
      if (!task) {
        throw new NotFoundError('Task not found')
      }

      const { data: newComment, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: userId,
          comment
        })
        .select(`
          *,
          user:users(id, full_name, email)
        `)
        .single()

      if (error) throw error

      const taskComment: TaskComment = {
        id: newComment.id,
        taskId: newComment.task_id,
        userId: newComment.user_id,
        comment: newComment.comment,
        createdAt: newComment.created_at,
        updatedAt: newComment.updated_at
      }

      return {
        success: true,
        message: 'Comment added successfully',
        comment: taskComment
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new Error('Failed to add comment')
    }
  }

  private async validateTaskData(data: CreateTaskData): Promise<void> {
    const errors: string[] = []

    if (!data.title?.trim()) {
      errors.push('Task title is required')
    }

    if (data.title && data.title.length > 200) {
      errors.push('Task title must be less than 200 characters')
    }

    if (data.description && data.description.length > 2000) {
      errors.push('Task description must be less than 2000 characters')
    }

    if (data.estimatedHours && (data.estimatedHours < 0 || data.estimatedHours > 1000)) {
      errors.push('Estimated hours must be between 0 and 1000')
    }

    if (data.dueDate) {
      const dueDate = new Date(data.dueDate)
      if (isNaN(dueDate.getTime())) {
        errors.push('Invalid due date format')
      }
    }

    if (data.startDate) {
      const startDate = new Date(data.startDate)
      if (isNaN(startDate.getTime())) {
        errors.push('Invalid start date format')
      }
    }

    if (data.startDate && data.dueDate) {
      const startDate = new Date(data.startDate)
      const dueDate = new Date(data.dueDate)
      if (startDate > dueDate) {
        errors.push('Start date cannot be after due date')
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Task validation failed', errors)
    }
  }

  private async validateAssignee(assigneeId: string): Promise<void> {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', assigneeId)
      .single()

    if (error || !data) {
      throw new ValidationError('Invalid assignee: user not found')
    }
  }

  private async validateTaskDependencies(dependencies: string[], excludeTaskId?: string): Promise<void> {
    for (const depId of dependencies) {
      if (depId === excludeTaskId) {
        throw new ValidationError('Task cannot depend on itself')
      }

      const task = await this.getTaskById(depId)
      if (!task) {
        throw new ValidationError(`Dependency task not found: ${depId}`)
      }

      // Check for circular dependencies
      if (excludeTaskId && await this.hasCircularDependency(excludeTaskId, depId)) {
        throw new ValidationError('Circular dependency detected')
      }
    }
  }

  private async hasCircularDependency(taskId: string, dependencyId: string): Promise<boolean> {
    const dependency = await this.getTaskById(dependencyId)
    if (!dependency || !dependency.dependencies) return false

    if (dependency.dependencies.includes(taskId)) {
      return true
    }

    for (const depId of dependency.dependencies) {
      if (await this.hasCircularDependency(taskId, depId)) {
        return true
      }
    }

    return false
  }

  private async getTasksWithDependency(taskId: string): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .contains('dependencies', [taskId])

      if (error) throw error

      return data?.map(task => this.mapDatabaseToTask(task)) || []
    } catch (error) {
      return []
    }
  }

  private mapDatabaseToTask(data: any): Task {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      assignedTo: data.assigned_to,
      assignedBy: data.assigned_by,
      status: data.status,
      priority: data.priority,
      dueDate: data.due_date,
      startDate: data.start_date,
      completedDate: data.completed_date,
      estimatedHours: data.estimated_hours,
      actualHours: data.actual_hours,
      tags: data.tags || [],
      attachments: data.attachments || [],
      dependencies: data.dependencies || [],
      projectId: data.project_id,
      departmentId: data.department_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      comments: data.comments?.map((comment: any) => ({
        id: comment.id,
        taskId: comment.task_id,
        userId: comment.user_id,
        comment: comment.comment,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at
      })) || []
    }
  }
}