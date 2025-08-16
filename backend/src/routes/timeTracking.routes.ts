import { Router } from 'express'
import { TimeTrackingController } from '../controllers/timeTracking.controller'
import { authenticateToken } from '../middleware/auth'
import { 
  permissionMiddleware,
  requireAuth,
  requireManager,
  requireHRAdmin
} from '../middleware/permission'

const router = Router()
const timeTrackingController = new TimeTrackingController()

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * Employee Time Tracking Operations
 */

// Check in - requires time.log permission
router.post('/check-in',
  permissionMiddleware.requirePermission('time.log'),
  timeTrackingController.checkIn.bind(timeTrackingController)
)

// Check in fallback (without location) - requires time.log permission
router.post('/check-in-fallback',
  permissionMiddleware.requirePermission('time.log'),
  timeTrackingController.checkInFallback.bind(timeTrackingController)
)

// Check out - requires time.log permission
router.post('/check-out',
  permissionMiddleware.requirePermission('time.log'),
  timeTrackingController.checkOut.bind(timeTrackingController)
)

// Get active time entry - requires time.log permission
router.get('/active',
  permissionMiddleware.requirePermission('time.log'),
  timeTrackingController.getActiveEntry.bind(timeTrackingController)
)

// Get current status - requires time.log permission
router.get('/status',
  permissionMiddleware.requirePermission('time.log'),
  timeTrackingController.getStatus.bind(timeTrackingController)
)

// Validate location - requires time.log permission
router.post('/validate-location',
  permissionMiddleware.requirePermission('time.log'),
  timeTrackingController.validateLocation.bind(timeTrackingController)
)

/**
 * Employee Time History and Reports
 */

// Get own time entries - requires time.log permission
router.get('/entries',
  permissionMiddleware.requirePermission('time.log'),
  timeTrackingController.getTimeEntries.bind(timeTrackingController)
)

// Get attendance record for specific date - requires time.log permission
router.get('/attendance/:date',
  permissionMiddleware.requirePermission('time.log'),
  timeTrackingController.getAttendanceRecord.bind(timeTrackingController)
)

// Get attendance records for date range - requires time.log permission
router.get('/attendance',
  permissionMiddleware.requirePermission('time.log'),
  timeTrackingController.getAttendanceRecords.bind(timeTrackingController)
)

// Get work hours summary - requires time.log permission
router.get('/summary',
  permissionMiddleware.requirePermission('time.log'),
  timeTrackingController.getWorkHoursSummary.bind(timeTrackingController)
)

/**
 * Manager Time Tracking Operations
 */

// Get team time entries - requires team.manage or time.review permission
router.get('/team/entries',
  permissionMiddleware.requireAnyPermission(['team.manage', 'time.review']),
  timeTrackingController.getTeamTimeEntries.bind(timeTrackingController)
)

// Get team attendance statistics - requires team.manage or time.review permission
router.get('/team/statistics',
  permissionMiddleware.requireAnyPermission(['team.manage', 'time.review']),
  timeTrackingController.getTeamStatistics.bind(timeTrackingController)
)

/**
 * Admin Time Tracking Operations
 */

// Get all time entries with filters - requires HR admin permissions
router.get('/admin/entries',
  requireHRAdmin,
  timeTrackingController.getAllTimeEntries.bind(timeTrackingController)
)

// Generate attendance report - requires HR admin permissions
router.get('/admin/report',
  requireHRAdmin,
  timeTrackingController.getAttendanceReport.bind(timeTrackingController)
)

export { router as timeTrackingRoutes }