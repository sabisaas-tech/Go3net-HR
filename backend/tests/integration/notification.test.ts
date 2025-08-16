import request from 'supertest'
import { app } from '../../src/server'
import { supabase } from '../../src/config/database'
import jwt from 'jsonwebtoken'

describe('Notification API Integration Tests', () => {
  let authToken: string
  let userId: string
  let adminToken: string
  let adminUserId: string

  beforeAll(async () => {
    // Create test users
    const testUser = {
      id: 'test-user-notifications',
      email: 'notifications@test.com',
      full_name: 'Test User',
      password_hash: 'hashed_password',
      employee_id: 'EMP-NOTIF-001',
      hire_date: '2024-01-01',
      status: 'active',
      account_status: 'active'
    }

    const adminUser = {
      id: 'admin-user-notifications',
      email: 'admin-notifications@test.com',
      full_name: 'Admin User',
      password_hash: 'hashed_password',
      employee_id: 'EMP-ADMIN-NOTIF-001',
      hire_date: '2024-01-01',
      status: 'active',
      account_status: 'active'
    }

    // Insert test users
    await supabase.from('users').upsert([testUser, adminUser])

    // Create user roles
    await supabase.from('user_roles').upsert([
      {
        user_id: testUser.id,
        role_name: 'employee',
        is_active: true
      },
      {
        user_id: adminUser.id,
        role_name: 'hr-admin',
        is_active: true
      }
    ])

    userId = testUser.id
    adminUserId = adminUser.id

    // Generate JWT tokens
    authToken = jwt.sign(
      { userId: testUser.id, role: 'employee', email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    )

    adminToken = jwt.sign(
      { userId: adminUser.id, role: 'hr-admin', email: adminUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    )
  })

  afterAll(async () => {
    // Clean up test data
    await supabase.from('user_roles').delete().in('user_id', [userId, adminUserId])
    await supabase.from('users').delete().in('id', [userId, adminUserId])
  })

  describe('GET /api/notifications/vapid-public-key', () => {
    it('should return VAPID public key', async () => {
      const response = await request(app)
        .get('/api/notifications/vapid-public-key')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('publicKey')
    })
  })

  describe('POST /api/notifications/subscribe', () => {
    it('should create a push notification subscription', async () => {
      const subscriptionData = {
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
          keys: {
            p256dh: 'test-p256dh-key',
            auth: 'test-auth-key'
          }
        }
      }

      const response = await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subscriptionData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Subscription created successfully')
      expect(response.body.data).toHaveProperty('id')
    })

    it('should return 401 without authentication', async () => {
      const subscriptionData = {
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
          keys: {
            p256dh: 'test-p256dh-key',
            auth: 'test-auth-key'
          }
        }
      }

      await request(app)
        .post('/api/notifications/subscribe')
        .send(subscriptionData)
        .expect(401)
    })

    it('should return 400 with invalid subscription data', async () => {
      const invalidData = {
        subscription: {
          endpoint: 'invalid-endpoint'
          // Missing keys
        }
      }

      await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400)
    })
  })

  describe('GET /api/notifications/subscriptions', () => {
    it('should return user subscriptions', async () => {
      const response = await request(app)
        .get('/api/notifications/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/notifications/subscriptions')
        .expect(401)
    })
  })

  describe('POST /api/notifications/unsubscribe', () => {
    it('should remove a subscription', async () => {
      const unsubscribeData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint'
      }

      const response = await request(app)
        .post('/api/notifications/unsubscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send(unsubscribeData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Subscription removed successfully')
    })

    it('should return 400 without endpoint', async () => {
      await request(app)
        .post('/api/notifications/unsubscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400)
    })
  })

  describe('GET /api/notifications/preferences', () => {
    it('should return user notification preferences', async () => {
      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('taskAssignments')
      expect(response.body.data).toHaveProperty('taskStatusChanges')
      expect(response.body.data).toHaveProperty('emailNotifications')
    })

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/notifications/preferences')
        .expect(401)
    })
  })

  describe('PUT /api/notifications/preferences', () => {
    it('should update user notification preferences', async () => {
      const preferences = {
        taskAssignments: false,
        taskStatusChanges: true,
        taskComments: false,
        dueDateReminders: true,
        emailNotifications: false,
        pushNotifications: true,
        reminderFrequency: 'hourly',
        quietHours: {
          enabled: true,
          start: '23:00',
          end: '07:00'
        }
      }

      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(preferences)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Preferences updated successfully')
    })

    it('should return 400 without preferences data', async () => {
      await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send()
        .expect(400)
    })
  })

  describe('GET /api/notifications/history', () => {
    it('should return notification history with pagination', async () => {
      const response = await request(app)
        .get('/api/notifications/history?limit=5&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.pagination).toEqual({
        limit: 5,
        offset: 0,
        hasMore: expect.any(Boolean)
      })
    })

    it('should use default pagination values', async () => {
      const response = await request(app)
        .get('/api/notifications/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.pagination.limit).toBe(50)
      expect(response.body.pagination.offset).toBe(0)
    })
  })

  describe('GET /api/notifications/stats', () => {
    it('should return notification statistics', async () => {
      const response = await request(app)
        .get('/api/notifications/stats?days=7')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('totalSent')
      expect(response.body.data).toHaveProperty('totalClicked')
    })

    it('should allow HR admin to view other user stats', async () => {
      const response = await request(app)
        .get(`/api/notifications/stats?userId=${userId}&days=30`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    it('should deny non-admin access to other user stats', async () => {
      await request(app)
        .get(`/api/notifications/stats?userId=${adminUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403)
    })
  })

  describe('POST /api/notifications/send', () => {
    it('should allow managers to send notifications', async () => {
      // First, create a manager token
      const managerUser = {
        id: 'manager-user-notifications',
        email: 'manager-notifications@test.com',
        full_name: 'Manager User',
        password_hash: 'hashed_password',
        employee_id: 'EMP-MGR-NOTIF-001',
        hire_date: '2024-01-01',
        status: 'active',
        account_status: 'active'
      }

      await supabase.from('users').upsert([managerUser])
      await supabase.from('user_roles').upsert([{
        user_id: managerUser.id,
        role_name: 'manager',
        is_active: true
      }])

      const managerToken = jwt.sign(
        { userId: managerUser.id, role: 'manager', email: managerUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      )

      const notificationData = {
        userIds: [userId],
        templateType: 'system_announcement',
        variables: {
          title: 'Test Notification',
          message: 'This is a test notification'
        }
      }

      const response = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(notificationData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Notifications sent successfully')

      // Cleanup
      await supabase.from('user_roles').delete().eq('user_id', managerUser.id)
      await supabase.from('users').delete().eq('id', managerUser.id)
    })

    it('should deny employees from sending notifications', async () => {
      const notificationData = {
        userIds: [userId],
        templateType: 'system_announcement',
        variables: {
          title: 'Test Notification',
          message: 'This is a test notification'
        }
      }

      await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData)
        .expect(403)
    })

    it('should return 400 with missing required fields', async () => {
      await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userIds: [userId] }) // Missing templateType
        .expect(400)
    })
  })

  describe('PATCH /api/notifications/:notificationId/clicked', () => {
    it('should mark notification as clicked', async () => {
      const response = await request(app)
        .patch('/api/notifications/test-notification-id/clicked')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Notification marked as clicked')
    })

    it('should return 400 without notification ID', async () => {
      await request(app)
        .patch('/api/notifications//clicked')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404) // Route not found
    })
  })

  describe('PATCH /api/notifications/:notificationId/dismissed', () => {
    it('should mark notification as dismissed', async () => {
      const response = await request(app)
        .patch('/api/notifications/test-notification-id/dismissed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Notification marked as dismissed')
    })
  })

  describe('GET /api/notifications/templates', () => {
    it('should allow HR admin to get templates', async () => {
      const response = await request(app)
        .get('/api/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('should deny non-admin access to templates', async () => {
      await request(app)
        .get('/api/notifications/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403)
    })
  })

  describe('POST /api/notifications/templates', () => {
    it('should allow HR admin to create templates', async () => {
      const templateData = {
        name: 'test_template',
        title: 'Test Template',
        body: 'This is a test template with {{variable}}',
        type: 'system_announcement',
        variables: ['variable'],
        isActive: true
      }

      const response = await request(app)
        .post('/api/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Template created successfully')
    })

    it('should return 400 with missing required fields', async () => {
      const incompleteData = {
        name: 'test_template'
        // Missing title, body, type
      }

      await request(app)
        .post('/api/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompleteData)
        .expect(400)
    })

    it('should deny non-admin access', async () => {
      const templateData = {
        name: 'test_template',
        title: 'Test Template',
        body: 'Test body',
        type: 'system_announcement'
      }

      await request(app)
        .post('/api/notifications/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(templateData)
        .expect(403)
    })
  })
})