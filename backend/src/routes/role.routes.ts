import { Router } from 'express'
import { 
  assignRole,
  getUserRoles,
  getMyRoles,
  updateUserPermissions,
  deactivateUserRole,
  getRoleHierarchy,
  getAvailableRoles,
  validatePermission
} from '../controllers/role.controller'
import { authenticateToken, requireRole } from '../middleware/auth'

const router = Router()

router.get('/hierarchy', getRoleHierarchy)
router.get('/available', getAvailableRoles)

router.use(authenticateToken)

router.get('/my-roles', getMyRoles)
router.get('/validate/:permission', validatePermission)

router.use(requireRole(['hr-admin', 'super-admin']))

router.post('/assign', assignRole)
router.get('/user/:userId', getUserRoles)
router.put('/permissions', updateUserPermissions)
router.delete('/user/:userId', deactivateUserRole)

export default router