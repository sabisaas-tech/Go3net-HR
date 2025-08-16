import { Request, Response } from 'express'
import { notificationController } from '../../../src/controllers/notification.controller'
import { notificationService } from '../../../src/services/notification.service'
import { taskNotificationService } from '../../../src/services/taskNotification.service'
import { AppError } from '../../../src/utils/errors'

// Mock dependencies
jest.mock('../../../src/services/notification.service')
jest.mock('../../../src/services/taskNotification.service')

const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>
const mockTaskNotificationService = taskNotificationService as jest.Mocked<typeof taskNotificationService>

interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    role: string
    email: string
    fullName?: string
  }
}

describe('NotificationController', () => {
  let mockRequest: Partial<AuthenticatedRequest>
  let mockResponse: Partial<Response>
  let mockNext: jest.Mock

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'user-123',
        role: 'employee',
        email: 'test@example.com',
        fullName: 'Test User'
      },
      body: {},
      params: {},
      query: {}
    }
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }
    mockNext = jest.fn()
    jest.clearAllMocks()
  })

  describe('subscribe', () => {
    it('should successfully create a subscription', async () => {
      const subscriptionData = {
        endpoint: 'https://example.com/push',
        keys: {
          p256dh: 'test-key',
          auth: 'test-auth'
        }
      }

      mockRequest.body = { subscription: subscriptionData }
      mockRequest.get = jest.fn().mockReturnValue('Mozilla/5.0')
      
      const mockResult = { id: 'sub-123', userId: 'user-123' }
      mockNotificationService.createSubscription.mockResolvedValue(mockResult)

      await notificationController.subscribe(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockNotificationService.createSubscription).toHaveBeenCalledWith(
        'user-123',
        subscriptionData,
        'Mozilla/5.0'
      )
      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Subscription created successfully',
        data: mockResult
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined

      await notificationController.subscribe(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not authenticated'
      })
    })

    it('should return 400 when subscription data is invalid', async () => {
      mockRequest.body = { subscription: { endpoint: 'invalid' } }

      await notificationController.subscribe(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid subscription data'
      })
    })
  })

  describe('unsubscribe', () => {
    it('should successfully remove a subscription', async () => {
      mockRequest.body = { endpoint: 'https://example.com/push' }
      mockNotificationService.removeSubscription.mockResolvedValue(undefined)

      await notificationController.unsubscribe(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockNotificationService.removeSubscription).toHaveBeenCalledWith(
        'user-123',
        'https://example.com/push'
      )
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Subscription removed successfully'
      })
    })

    it('should return 400 when endpoint is missing', async () => {
      mockRequest.body = {}

      await notificationController.unsubscribe(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Endpoint is required'
      })
    })
  })

  describe('sendNotification', () => {
    beforeEach(() => {
      mockRequest.user!.role = 'manager'
    })

    it('should successfully send notification for managers', async () => {
      mockRequest.body = {
        userIds: ['user-456'],
        templateType: 'task_assignment',
        variables: { taskTitle: 'Test Task' }
      }

      mockNotificationService.sendNotification.mockResolvedValue(undefined)

      await notificationController.sendNotification(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        ['user-456'],
        'task_assignment',
        { taskTitle: 'Test Task' },
        undefined
      )
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notifications sent successfully'
      })
    })

    it('should return 403 for insufficient permissions', async () => {
      mockRequest.user!.role = 'employee'

      await notificationController.sendNotification(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      })
    })

    it('should return 400 when required fields are missing', async () => {
      mockRequest.body = { userIds: ['user-456'] } // Missing templateType

      await notificationController.sendNotification(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User IDs and template type are required'
      })
    })
  })

  describe('getNotificationHistory', () => {
    it('should return notification history with pagination', async () => {
      mockRequest.query = { limit: '10', offset: '0' }
      
      const mockNotifications = [
        { id: 'notif-1', title: 'Test Notification', createdAt: '2024-01-01' }
      ]
      mockNotificationService.getUserNotificationHistory.mockResolvedValue(mockNotifications)

      await notificationController.getNotificationHistory(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockNotificationService.getUserNotificationHistory).toHaveBeenCalledWith('user-123', 10, 0)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockNotifications,
        pagination: {
          limit: 10,
          offset: 0,
          hasMore: false
        }
      })
    })

    it('should use default pagination values', async () => {
      mockRequest.query = {}
      mockNotificationService.getUserNotificationHistory.mockResolvedValue([])

      await notificationController.getNotificationHistory(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockNotificationService.getUserNotificationHistory).toHaveBeenCalledWith('user-123', 50, 0)
    })
  })

  describe('markNotificationClicked', () => {
    it('should successfully mark notification as clicked', async () => {
      mockRequest.params = { notificationId: 'notif-123' }
      mockNotificationService.markNotificationClicked.mockResolvedValue(undefined)

      await notificationController.markNotificationClicked(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockNotificationService.markNotificationClicked).toHaveBeenCalledWith('notif-123')
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification marked as clicked'
      })
    })

    it('should return 400 when notification ID is missing', async () => {
      mockRequest.params = {}

      await notificationController.markNotificationClicked(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Notification ID is required'
      })
    })
  })

  describe('getPreferences', () => {
    it('should return user notification preferences', async () => {
      const mockPreferences = {
        taskAssignments: true,
        taskStatusChanges: false,
        emailNotifications: true
      }
      mockTaskNotificationService.getUserPreferences.mockResolvedValue(mockPreferences)

      await notificationController.getPreferences(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskNotificationService.getUserPreferences).toHaveBeenCalledWith('user-123')
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPreferences
      })
    })

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined

      await notificationController.getPreferences(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not authenticated'
      })
    })
  })

  describe('updatePreferences', () => {
    it('should successfully update user preferences', async () => {
      const preferences = {
        taskAssignments: false,
        taskStatusChanges: true,
        emailNotifications: false
      }
      mockRequest.body = preferences
      mockTaskNotificationService.updateUserPreferences.mockResolvedValue(true)

      await notificationController.updatePreferences(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockTaskNotificationService.updateUserPreferences).toHaveBeenCalledWith('user-123', preferences)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Preferences updated successfully'
      })
    })

    it('should return 400 when preferences data is missing', async () => {
      mockRequest.body = undefined

      await notificationController.updatePreferences(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Preferences data is required'
      })
    })

    it('should return 500 when update fails', async () => {
      mockRequest.body = { taskAssignments: true }
      mockTaskNotificationService.updateUserPreferences.mockResolvedValue(false)

      await notificationController.updatePreferences(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update preferences'
      })
    })
  })

  describe('getVapidPublicKey', () => {
    it('should return VAPID public key', async () => {
      process.env.VAPID_PUBLIC_KEY = 'test-public-key'

      await notificationController.getVapidPublicKey(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          publicKey: 'test-public-key'
        }
      })
    })

    it('should return 500 when VAPID key is not configured', async () => {
      delete process.env.VAPID_PUBLIC_KEY

      await notificationController.getVapidPublicKey(mockRequest as Request, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'VAPID public key not configured'
      })
    })
  })

  describe('getNotificationStats', () => {
    it('should return notification stats for the user', async () => {
      mockRequest.query = { days: '7' }
      
      const mockStats = {
        totalSent: 10,
        totalClicked: 5,
        clickRate: 0.5
      }
      mockNotificationService.getNotificationStats.mockResolvedValue(mockStats)

      await notificationController.getNotificationStats(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockNotificationService.getNotificationStats).toHaveBeenCalledWith('user-123', 7)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      })
    })

    it('should allow HR admins to view other users stats', async () => {
      mockRequest.user!.role = 'hr-admin'
      mockRequest.query = { userId: 'other-user', days: '30' }
      
      const mockStats = { totalSent: 20, totalClicked: 10, clickRate: 0.5 }
      mockNotificationService.getNotificationStats.mockResolvedValue(mockStats)

      await notificationController.getNotificationStats(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockNotificationService.getNotificationStats).toHaveBeenCalledWith('other-user', 30)
    })

    it('should return 403 when non-admin tries to view other users stats', async () => {
      mockRequest.user!.role = 'employee'
      mockRequest.query = { userId: 'other-user' }

      await notificationController.getNotificationStats(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      })
    })
  })

  describe('error handling', () => {
    it('should handle AppError instances correctly', async () => {
      mockRequest.body = { subscription: { endpoint: 'test' } }
      mockNotificationService.createSubscription.mockRejectedValue(new AppError('Custom error', 422))

      await notificationController.subscribe(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(422)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Custom error'
      })
    })

    it('should handle generic errors with 500 status', async () => {
      mockRequest.body = { subscription: { endpoint: 'test', keys: { p256dh: 'test', auth: 'test' } } }
      mockRequest.get = jest.fn().mockReturnValue('Mozilla/5.0')
      mockNotificationService.createSubscription.mockRejectedValue(new Error('Generic error'))

      await notificationController.subscribe(mockRequest as AuthenticatedRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      })
    })
  })
})