import { notificationService } from '../../../src/services/notification.service'
import { pool } from '../../../src/config/database'

// Mock the database pool
jest.mock('../../../src/config/database', () => ({
  pool: {
    query: jest.fn()
  }
}))

const mockPool = pool as jest.Mocked<typeof pool>

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createSubscription', () => {
    it('should create a new subscription successfully', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        p256dhKey: 'test-p256dh-key',
        authKey: 'test-auth-key',
        userAgent: 'Mozilla/5.0',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [mockSubscription],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      })

      const subscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key'
        }
      }

      const result = await notificationService.createSubscription('user-1', subscription, 'Mozilla/5.0')

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_subscriptions'),
        ['user-1', subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, 'Mozilla/5.0']
      )
      expect(result).toEqual(mockSubscription)
    })

    it('should handle subscription creation errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'))

      const subscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key'
        }
      }

      await expect(
        notificationService.createSubscription('user-1', subscription)
      ).rejects.toThrow('Database error')
    })
  })

  describe('getSubscriptionsByUserId', () => {
    it('should return user subscriptions', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          userId: 'user-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/test1',
          p256dhKey: 'test-p256dh-key-1',
          authKey: 'test-auth-key-1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sub-2',
          userId: 'user-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/test2',
          p256dhKey: 'test-p256dh-key-2',
          authKey: 'test-auth-key-2',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockSubscriptions,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: []
      })

      const result = await notificationService.getSubscriptionsByUserId('user-1')

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM notification_subscriptions'),
        ['user-1']
      )
      expect(result).toEqual(mockSubscriptions)
    })
  })

  describe('removeSubscription', () => {
    it('should deactivate a subscription', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      })

      await notificationService.removeSubscription('user-1', 'https://fcm.googleapis.com/fcm/send/test')

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notification_subscriptions'),
        ['user-1', 'https://fcm.googleapis.com/fcm/send/test']
      )
    })
  })

  describe('createTemplate', () => {
    it('should create a notification template', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'test_template',
        title: 'Test Template',
        body: 'This is a test template with {{variable}}',
        type: 'task_assignment',
        variables: ['variable'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [mockTemplate],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      })

      const templateData = {
        name: 'test_template',
        title: 'Test Template',
        body: 'This is a test template with {{variable}}',
        type: 'task_assignment' as const,
        variables: ['variable'],
        isActive: true
      }

      const result = await notificationService.createTemplate(templateData)

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_templates'),
        [
          templateData.name,
          templateData.title,
          templateData.body,
          templateData.type,
          JSON.stringify(templateData.variables),
          templateData.isActive
        ]
      )
      expect(result).toEqual(mockTemplate)
    })
  })

  describe('getTemplateByType', () => {
    it('should return template by type', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'task_assignment',
        title: 'New Task Assigned',
        body: 'You have been assigned a new task: {{taskTitle}}',
        type: 'task_assignment',
        variables: ['taskTitle', 'assignedBy'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [mockTemplate],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      })

      const result = await notificationService.getTemplateByType('task_assignment')

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM notification_templates'),
        ['task_assignment']
      )
      expect(result).toEqual(mockTemplate)
    })

    it('should return null if template not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      })

      const result = await notificationService.getTemplateByType('non_existent_type' as any)

      expect(result).toBeNull()
    })
  })

  describe('sendNotification', () => {
    it('should send notification to single user', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'task_assignment',
        title: 'New Task Assigned',
        body: 'You have been assigned a new task: {{taskTitle}}',
        type: 'task_assignment',
        variables: ['taskTitle'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockSubscriptions = [
        {
          id: 'sub-1',
          userId: 'user-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/test',
          p256dhKey: 'test-p256dh-key',
          authKey: 'test-auth-key',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      // Mock template query
      mockPool.query.mockResolvedValueOnce({
        rows: [mockTemplate],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      })

      // Mock subscriptions query
      mockPool.query.mockResolvedValueOnce({
        rows: mockSubscriptions,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      })

      // Mock log insertion
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'log-1' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      })

      await notificationService.sendNotification('user-1', 'task_assignment', { taskTitle: 'Test Task' })

      expect(mockPool.query).toHaveBeenCalledTimes(3)
    })

    it('should send notification to multiple users', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'task_assignment',
        title: 'New Task Assigned',
        body: 'You have been assigned a new task: {{taskTitle}}',
        type: 'task_assignment',
        variables: ['taskTitle'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Mock template query
      mockPool.query.mockResolvedValueOnce({
        rows: [mockTemplate],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      })

      // Mock subscriptions queries for each user
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'sub-1', userId: 'user-1', endpoint: 'test1' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      })

      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'sub-2', userId: 'user-2', endpoint: 'test2' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      })

      // Mock log insertions
      mockPool.query.mockResolvedValue({
        rows: [{ id: 'log-1' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      })

      await notificationService.sendNotification(['user-1', 'user-2'], 'task_assignment', { taskTitle: 'Test Task' })

      expect(mockPool.query).toHaveBeenCalledTimes(5) // 1 template + 2 subscriptions + 2 logs
    })

    it('should throw error if template not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      })

      await expect(
        notificationService.sendNotification('user-1', 'non_existent_type' as any, {})
      ).rejects.toThrow('No active template found for type: non_existent_type')
    })
  })

  describe('getNotificationStats', () => {
    it('should return notification statistics', async () => {
      const mockStats = {
        total: '100',
        sent: '80',
        clicked: '20',
        dismissed: '10',
        failed: '20'
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [mockStats],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      })

      const result = await notificationService.getNotificationStats('user-1', 30)

      expect(result).toEqual({
        total: 100,
        sent: 80,
        clicked: 20,
        dismissed: 10,
        failed: 20,
        clickRate: 25 // (20/80) * 100
      })
    })

    it('should handle zero sent notifications', async () => {
      const mockStats = {
        total: '10',
        sent: '0',
        clicked: '0',
        dismissed: '0',
        failed: '10'
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [mockStats],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      })

      const result = await notificationService.getNotificationStats('user-1', 30)

      expect(result.clickRate).toBe(0)
    })
  })

  describe('getUserNotificationHistory', () => {
    it('should return user notification history', async () => {
      const mockHistory = [
        {
          id: 'log-1',
          userId: 'user-1',
          title: 'Test Notification',
          body: 'Test body',
          type: 'task_assignment',
          status: 'sent',
          createdAt: new Date()
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockHistory,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      })

      const result = await notificationService.getUserNotificationHistory('user-1', 50, 0)

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM notification_logs'),
        ['user-1', 50, 0]
      )
      expect(result).toEqual(mockHistory)
    })
  })

  describe('markNotificationClicked', () => {
    it('should mark notification as clicked', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      })

      await notificationService.markNotificationClicked('notification-1')

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notification_logs'),
        ['notification-1']
      )
    })
  })

  describe('markNotificationDismissed', () => {
    it('should mark notification as dismissed', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      })

      await notificationService.markNotificationDismissed('notification-1')

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notification_logs'),
        ['notification-1']
      )
    })
  })

  describe('cleanupOldNotifications', () => {
    it('should cleanup old notifications', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 50,
        command: 'DELETE',
        oid: 0,
        fields: []
      })

      const result = await notificationService.cleanupOldNotifications(90)

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notification_logs')
      )
      expect(result).toBe(50)
    })
  })
})