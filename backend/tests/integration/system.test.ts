import request from 'supertest'
import { app } from '../../src/server'
import { supabase } from '../../src/config/database'
import jwt from 'jsonwebtoken'

describe('System API Integration Tests', () => {
  let adminToken: string
  let adminUserId: string

  beforeAll(async () => {
    // Create admin user for system tests
    const adminUser = {
      id: 'admin-system-test',
      email: 'admin-system@test.com',
      full_name: 'System Admin',
      password_hash: 'hashed_password',
      employee_id: 'EMP-SYS-001',
      hire_date: '2024-01-01',
      status: 'active',
      account_status: 'active'
    }

    await supabase.from('users').upsert([adminUser])
    await supabase.from('user_roles').upsert([{
      user_id: adminUser.id,
      role_name: 'super-admin',
      is_active: true
    }])

    adminUserId = adminUser.id
    adminToken = jwt.sign(
      { userId: adminUser.id, role: 'super-admin', email: adminUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    )
  })

  afterAll(async () => {
    // Clean up test data
    await supabase.from('user_roles').delete().eq('user_id', adminUserId)
    await supabase.from('users').delete().eq('id', adminUserId)
  })

  describe('GET /api/system/health', () => {
    it('should return system health status', async () => {
      const response = await request(app)
        .get('/api/system/health')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('status')
      expect(response.body.data).toHaveProperty('timestamp')
      expect(response.body.data).toHaveProperty('uptime')
      expect(response.body.data).toHaveProperty('database')
    })
  })

  describe('GET /api/system/stats', () => {
    it('should return system statistics for admin', async () => {
      const response = await request(app)
        .get('/api/system/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('users')
      expect(response.body.data).toHaveProperty('tasks')
      expect(response.body.data).toHaveProperty('checkIns')
      expect(response.body.data).toHaveProperty('notifications')
    })

    it('should deny access to non-admin users', async () => {
      // Create regular user token
      const regularToken = jwt.sign(
        { userId: 'regular-user', role: 'employee', email: 'regular@test.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      )

      await request(app)
        .get('/api/system/stats')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403)
    })

    it('should require authentication', async () => {
      await request(app)
        .get('/api/system/stats')
        .expect(401)
    })
  })

  describe('POST /api/system/initialize', () => {
    it('should initialize system for super admin', async () => {
      const initData = {
        companyName: 'Test Company',
        adminEmail: 'test-admin@company.com',
        adminPassword: 'SecurePassword123'
      }

      const response = await request(app)
        .post('/api/system/initialize')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(initData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('initialized')
    })

    it('should deny access to non-super-admin users', async () => {
      const hrAdminToken = jwt.sign(
        { userId: 'hr-admin', role: 'hr-admin', email: 'hr@test.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      )

      const initData = {
        companyName: 'Test Company',
        adminEmail: 'test-admin@company.com',
        adminPassword: 'SecurePassword123'
      }

      await request(app)
        .post('/api/system/initialize')
        .set('Authorization', `Bearer ${hrAdminToken}`)
        .send(initData)
        .expect(403)
    })

    it('should validate required fields', async () => {
      const incompleteData = {
        companyName: 'Test Company'
        // Missing adminEmail and adminPassword
      }

      await request(app)
        .post('/api/system/initialize')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompleteData)
        .expect(400)
    })
  })

  describe('GET /api/system/logs', () => {
    it('should return system logs for admin', async () => {
      const response = await request(app)
        .get('/api/system/logs?limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.pagination).toHaveProperty('limit')
      expect(response.body.pagination).toHaveProperty('offset')
    })

    it('should filter logs by level', async () => {
      const response = await request(app)
        .get('/api/system/logs?level=error')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      // All returned logs should be error level
      response.body.data.forEach((log: any) => {
        expect(log.level).toBe('error')
      })
    })

    it('should filter logs by date range', async () => {
      const startDate = '2024-01-01'
      const endDate = '2024-12-31'

      const response = await request(app)
        .get(`/api/system/logs?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    it('should deny access to non-admin users', async () => {
      const employeeToken = jwt.sign(
        { userId: 'employee', role: 'employee', email: 'employee@test.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      )

      await request(app)
        .get('/api/system/logs')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403)
    })
  })

  describe('POST /api/system/backup', () => {
    it('should create system backup for super admin', async () => {
      const response = await request(app)
        .post('/api/system/backup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ includeFiles: false })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('backupId')
      expect(response.body.data).toHaveProperty('createdAt')
    })

    it('should deny access to non-super-admin users', async () => {
      const hrAdminToken = jwt.sign(
        { userId: 'hr-admin', role: 'hr-admin', email: 'hr@test.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      )

      await request(app)
        .post('/api/system/backup')
        .set('Authorization', `Bearer ${hrAdminToken}`)
        .send({ includeFiles: false })
        .expect(403)
    })
  })

  describe('GET /api/system/version', () => {
    it('should return system version information', async () => {
      const response = await request(app)
        .get('/api/system/version')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('version')
      expect(response.body.data).toHaveProperty('buildDate')
      expect(response.body.data).toHaveProperty('environment')
    })
  })

  describe('POST /api/system/maintenance', () => {
    it('should enable maintenance mode for super admin', async () => {
      const response = await request(app)
        .post('/api/system/maintenance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          enabled: true, 
          message: 'System maintenance in progress' 
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('maintenance mode')
    })

    it('should disable maintenance mode', async () => {
      const response = await request(app)
        .post('/api/system/maintenance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: false })
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    it('should deny access to non-super-admin users', async () => {
      const managerToken = jwt.sign(
        { userId: 'manager', role: 'manager', email: 'manager@test.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      )

      await request(app)
        .post('/api/system/maintenance')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ enabled: true })
        .expect(403)
    })
  })

  describe('Error handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/system/initialize')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('should handle missing authorization header', async () => {
      await request(app)
        .get('/api/system/stats')
        .expect(401)
    })

    it('should handle invalid JWT token', async () => {
      await request(app)
        .get('/api/system/stats')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
    })
  })
})