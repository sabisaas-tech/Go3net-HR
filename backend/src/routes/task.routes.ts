import { Router } from 'express'
import { TaskController } from '../controllers/task.controller'
import { authenticateToken } from '../middleware/auth'
import { permissionMiddleware } from '../middleware/permission'

const router = Router()
const taskController = new TaskController()

// Apply authentication to all routes
router.use(authenticateToken)

// Task CRUD operations
router.post(
  '/',
  permissionMiddleware.requireAnyPermission(['tasks.create', 'tasks.assign']),
  taskController.createTask.bind(taskController)
)

router.get(
  '/search',
  permissionMiddleware.requirePermission('tasks.read'),
  taskController.searchTasks.bind(taskController)
)

router.get(
  '/my-tasks',
  permissionMiddleware.requirePermission('tasks.read'),
  taskController.getMyTasks.bind(taskController)
)

router.get(
  '/created-by-me',
  permissionMiddleware.requireAnyPermission(['tasks.create', 'tasks.assign']),
  taskController.getTasksCreatedByMe.bind(taskController)
)

router.get(
  '/overdue',
  permissionMiddleware.requireAnyPermission(['tasks.read', 'tasks.assign']),
  taskController.getOverdueTasks.bind(taskController)
)

router.get(
  '/statistics',
  permissionMiddleware.requireAnyPermission(['tasks.read', 'tasks.assign', 'reports.generate']),
  taskController.getTaskStatistics.bind(taskController)
)

router.get(
  '/:id',
  permissionMiddleware.requireResourcePermission({
    resource: 'tasks',
    action: 'read',
    allowSelf: true
  }),
  taskController.getTaskById.bind(taskController)
)

router.put(
  '/:id',
  permissionMiddleware.requireResourcePermission({
    resource: 'tasks',
    action: 'update',
    allowSelf: true
  }),
  taskController.updateTask.bind(taskController)
)

router.delete(
  '/:id',
  permissionMiddleware.requireAnyPermission(['tasks.delete', 'tasks.assign']),
  taskController.deleteTask.bind(taskController)
)

// Task assignment operations
router.patch(
  '/:id/assign',
  permissionMiddleware.requirePermission('tasks.assign'),
  taskController.assignTask.bind(taskController)
)

router.patch(
  '/:id/status',
  permissionMiddleware.requireResourcePermission({
    resource: 'tasks',
    action: 'update',
    allowSelf: true
  }),
  taskController.updateTaskStatus.bind(taskController)
)

// Task comments
router.post(
  '/:id/comments',
  permissionMiddleware.requireResourcePermission({
    resource: 'tasks',
    action: 'read',
    allowSelf: true
  }),
  taskController.addTaskComment.bind(taskController)
)

export default router