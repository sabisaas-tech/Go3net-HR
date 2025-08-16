import { Router } from 'express'
import { notificationController } from '../controllers/notification.controller'
import { authenticateToken } from '../middleware/auth'
import { requireHRAdmin, requireManager } from '../middleware/permission'

const router = Router()

// Public routes
router.get('/vapid-public-key', notificationController.getVapidPublicKey)

// Protected routes - require authentication
router.use(authenticateToken)

// Subscription management
router.post('/subscribe', notificationController.subscribe)
router.post('/unsubscribe', notificationController.unsubscribe)
router.get('/subscriptions', notificationController.getSubscriptions)

// Notification management
router.get('/history', notificationController.getNotificationHistory)
router.patch('/:notificationId/clicked', notificationController.markNotificationClicked)
router.patch('/:notificationId/dismissed', notificationController.markNotificationDismissed)

// Notification preferences
router.get('/preferences', notificationController.getPreferences)
router.put('/preferences', notificationController.updatePreferences)

// Analytics
router.get('/stats', notificationController.getNotificationStats)

// Admin routes - require elevated permissions
router.post('/send', requireManager, notificationController.sendNotification)
router.get('/templates', requireHRAdmin, notificationController.getTemplates)
router.post('/templates', requireHRAdmin, notificationController.createTemplate)

export default router