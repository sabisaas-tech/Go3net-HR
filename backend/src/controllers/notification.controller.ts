import { Request, Response } from 'express'
import { notificationService } from '../services/notification.service'
import { taskNotificationService } from '../services/taskNotification.service'
import { AppError } from '../utils/errors'

interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    role: string
    email: string
  }
}

export class NotificationController {
  // Subscription Management
  async subscribe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        throw new AppError('User not authenticated', 401)
      }

      const { subscription } = req.body
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        throw new AppError('Invalid subscription data', 400)
      }

      const userAgent = req.get('User-Agent')
      const result = await notificationService.createSubscription(userId, subscription, userAgent)

      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: result
      })
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        })
      } else {
        console.error('Subscribe error:', error)
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        })
      }
    }
  }

  async unsubscribe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        throw new AppError('User not authenticated', 401)
      }

      const { endpoint } = req.body
      if (!endpoint) {
        throw new AppError('Endpoint is required', 400)
      }

      await notificationService.removeSubscription(userId, endpoint)

      res.json({
        success: true,
        message: 'Subscription removed successfully'
      })
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        })
      } else {
        console.error('Unsubscribe error:', error)
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        })
      }
    }
  }

  async getSubscriptions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        throw new AppError('User not authenticated', 401)
      }

      const subscriptions = await notificationService.getSubscriptionsByUserId(userId)

      res.json({
        success: true,
        data: subscriptions
      })
    } catch (error) {
      console.error('Get subscriptions error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  // Notification Management
  async sendNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role
      if (!userRole || !['hr-admin', 'super-admin', 'manager'].includes(userRole)) {
        throw new AppError('Insufficient permissions', 403)
      }

      const { userIds, templateType, variables, customPayload } = req.body

      if (!userIds || !templateType) {
        throw new AppError('User IDs and template type are required', 400)
      }

      await notificationService.sendNotification(userIds, templateType, variables, customPayload)

      res.json({
        success: true,
        message: 'Notifications sent successfully'
      })
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        })
      } else {
        console.error('Send notification error:', error)
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        })
      }
    }
  }

  async getNotificationHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        throw new AppError('User not authenticated', 401)
      }

      const limit = parseInt(req.query.limit as string) || 50
      const offset = parseInt(req.query.offset as string) || 0

      const notifications = await notificationService.getUserNotificationHistory(userId, limit, offset)

      res.json({
        success: true,
        data: notifications,
        pagination: {
          limit,
          offset,
          hasMore: notifications.length === limit
        }
      })
    } catch (error) {
      console.error('Get notification history error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  async markNotificationClicked(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params

      if (!notificationId) {
        throw new AppError('Notification ID is required', 400)
      }

      await notificationService.markNotificationClicked(notificationId)

      res.json({
        success: true,
        message: 'Notification marked as clicked'
      })
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        })
      } else {
        console.error('Mark notification clicked error:', error)
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        })
      }
    }
  }

  async markNotificationDismissed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params

      if (!notificationId) {
        throw new AppError('Notification ID is required', 400)
      }

      await notificationService.markNotificationDismissed(notificationId)

      res.json({
        success: true,
        message: 'Notification marked as dismissed'
      })
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        })
      } else {
        console.error('Mark notification dismissed error:', error)
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        })
      }
    }
  }

  // Template Management (Admin only)
  async getTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role
      if (!userRole || !['hr-admin', 'super-admin'].includes(userRole)) {
        throw new AppError('Insufficient permissions', 403)
      }

      const templates = await notificationService.getAllTemplates()

      res.json({
        success: true,
        data: templates
      })
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        })
      } else {
        console.error('Get templates error:', error)
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        })
      }
    }
  }

  async createTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role
      if (!userRole || !['hr-admin', 'super-admin'].includes(userRole)) {
        throw new AppError('Insufficient permissions', 403)
      }

      const { name, title, body, type, variables, isActive } = req.body

      if (!name || !title || !body || !type) {
        throw new AppError('Name, title, body, and type are required', 400)
      }

      const template = await notificationService.createTemplate({
        name,
        title,
        body,
        type,
        variables: variables || [],
        isActive: isActive !== undefined ? isActive : true
      })

      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: template
      })
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        })
      } else {
        console.error('Create template error:', error)
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        })
      }
    }
  }

  // Analytics
  async getNotificationStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      const userRole = req.user?.role
      
      if (!userId) {
        throw new AppError('User not authenticated', 401)
      }

      const days = parseInt(req.query.days as string) || 30
      const targetUserId = req.query.userId as string

      // Only admins can view other users' stats
      if (targetUserId && targetUserId !== userId && !['hr-admin', 'super-admin'].includes(userRole || '')) {
        throw new AppError('Insufficient permissions', 403)
      }

      const stats = await notificationService.getNotificationStats(targetUserId || userId, days)

      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        })
      } else {
        console.error('Get notification stats error:', error)
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        })
      }
    }
  }

  // Notification Preferences
  async getPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        throw new AppError('User not authenticated', 401)
      }

      const preferences = await taskNotificationService.getUserPreferences(userId)

      res.json({
        success: true,
        data: preferences
      })
    } catch (error) {
      console.error('Get preferences error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  async updatePreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      if (!userId) {
        throw new AppError('User not authenticated', 401)
      }

      const preferences = req.body
      if (!preferences) {
        throw new AppError('Preferences data is required', 400)
      }

      const success = await taskNotificationService.updateUserPreferences(userId, preferences)

      if (!success) {
        throw new AppError('Failed to update preferences', 500)
      }

      res.json({
        success: true,
        message: 'Preferences updated successfully'
      })
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        })
      } else {
        console.error('Update preferences error:', error)
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        })
      }
    }
  }

  // VAPID Public Key
  async getVapidPublicKey(req: Request, res: Response): Promise<void> {
    try {
      const publicKey = process.env.VAPID_PUBLIC_KEY

      if (!publicKey) {
        throw new AppError('VAPID public key not configured', 500)
      }

      res.json({
        success: true,
        data: {
          publicKey
        }
      })
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        })
      } else {
        console.error('Get VAPID public key error:', error)
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        })
      }
    }
  }
}

export const notificationController = new NotificationController()