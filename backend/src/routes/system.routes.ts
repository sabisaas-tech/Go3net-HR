import { Router } from 'express'
import { initializeSystem, getSystemStatus, createFirstHRAdmin } from '../controllers/system.controller'
import { authenticateToken } from '../middleware/auth'
import { permissionMiddleware } from '../middleware/permission'

const router = Router()

router.get('/status', getSystemStatus)

router.post('/initialize', initializeSystem)

router.post(
  '/create-hr-admin',
  authenticateToken,
  permissionMiddleware.requireMinimumRole('super-admin'),
  createFirstHRAdmin
)

export { router as systemRoutes }