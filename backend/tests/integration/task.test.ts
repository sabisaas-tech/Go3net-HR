import request from 'supertest'
import app from '../../src/server'
import { supabase } from '../../src/config/database'
import { generateTokens } from '../../src/utils/jwt'

describe('Task Management API', () => {
  let authToken: string
  let managerToken: string
  let employeeToken: string
  let testUserId: string
  let managerId: string
  let employeeId: string
  let testTaskId: string

  beforeAll(async () => {
    // Create test users
    const { data: manager } = await supabase
      .from('users')
      .insert({
        email: 'manager@test.com',
        full_name: 'Test Manager',
        employee_id: 'MGR001',
        status: 'active',
        account_status: 'active'
      })
      .select()
      .single()

    const { data: employee } = await supabase
      .from('users')
      .insert({
        email: 'employee@test.com',
        full_name: 'Test Employee',
        employee_id: 'EMP001',
        status: 'active',
        account_status: 'active'
      })
      .select()
      .single()

    managerId = manager.id
    employeeId = employee.id
    testUserId = managerId

    // Create roles for test users
    await supabase.from('user_roles').insert([
      {
        user_id: managerId,
        role_name: 'manager',
        permissions: ['tasks.create', 'tasks.read', 'tasks.update', 'tasks.assign', 'tasks.delete'],
        is_active: true
      },
      {
        user_id: employeeId,
        role_name: 'employee',
        permissions: ['tasks.read', 'tasks.update'],
        is_active: true
      }
    ])

    // Generate tokens
    managerToken = generateTokens({ userId: managerId, email: 'manager@test.com', role: 'manager' }).accessToken
    employeeToken = generateTokens({ userId: employeeId, email: 'employee@test.com', role: 'employee' }).accessToken
    authToken = managerToken
  })

  afterAll(async () => {
    // Clean up test data
    await supabase.from('task_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('user_roles').delete().in('user_id', [managerId, employeeId])
    await supabase.from('users').delete().in('id', [managerId, employeeId])
  })

  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const taskData = {
        title: 'Complete project documentation',
        description: 'Write comprehensive documentation for the project',
        assignedTo: employeeId,
        priority: 'high',
        dueDate: '2023-12-31',
        estimatedHours: 8,
        tags: ['documentation', 'project']
      }

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe(taskData.title)
      expect(response.body.data.assignedTo).toBe(employeeId)
      expect(response.body.data.status).toBe('pending')
      expect(response.body.data.priority).toBe('high')

      testTaskId = response.body.data.id
    })

    it('should reject task creation with invalid data', async () => {
      const invalidTaskData = {
        title: '', // Empty title
        estimatedHours: -5 // Invalid hours
      }

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTaskData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('should reject task creation without authentication', async () => {
      const taskData = {
        title: 'Test task'
      }

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)

      expect(response.status).toBe(401)
    })

    it('should reject task creation without proper permissions', async () => {
      // Create user without task creation permissions
      const { data: limitedUser } = await supabase
        .from('users')
        .insert({
          email: 'limited@test.com',
          full_name: 'Limited User',
          employee_id: 'LIM001',
          status: 'active',
          account_status: 'active'
        })
        .select()
        .single()

      await supabase.from('user_roles').insert({
        user_id: limitedUser.id,
        role_name: 'employee',
        permissions: ['profile.read'], // No task permissions
        is_active: true
      })

      const limitedToken = generateTokens({ userId: limitedUser.id, email: 'limited@test.com', role: 'employee' }).accessToken

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${limitedToken}`)
        .send({ title: 'Test task' })

      expect(response.status).toBe(403)

      // Cleanup
      await supabase.from('user_roles').delete().eq('user_id', limitedUser.id)
      await supabase.from('users').delete().eq('id', limitedUser.id)
    })
  })

  describe('GET /api/tasks/:id', () => {
    it('should retrieve task by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(testTaskId)
      expect(response.body.data.title).toBe('Complete project documentation')
    })

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get('/api/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })

    it('should allow assigned employee to view their task', async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${employeeToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(testTaskId)
    })
  })

  describe('PUT /api/tasks/:id', () => {
    it('should update task successfully', async () => {
      const updateData = {
        title: 'Updated task title',
        priority: 'medium',
        status: 'in_progress'
      }

      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe('Updated task title')
      expect(response.body.data.priority).toBe('medium')
      expect(response.body.data.status).toBe('in_progress')
    })

    it('should allow assigned employee to update task status', async () => {
      const updateData = {
        status: 'completed',
        actualHours: 6
      }

      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe('completed')
      expect(response.body.data.actualHours).toBe(6)
      expect(response.body.data.completedDate).toBeTruthy()
    })

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .put('/api/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated title' })

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/tasks/search', () => {
    beforeAll(async () => {
      // Create additional test tasks for search
      await supabase.from('tasks').insert([
        {
          title: 'High priority task',
          assigned_to: employeeId,
          assigned_by: managerId,
          created_by: managerId,
          status: 'pending',
          priority: 'high',
          tags: ['urgent', 'important']
        },
        {
          title: 'Low priority task',
          assigned_to: employeeId,
          assigned_by: managerId,
          created_by: managerId,
          status: 'in_progress',
          priority: 'low',
          tags: ['routine']
        }
      ])
    })

    it('should search tasks with filters', async () => {
      const response = await request(app)
        .get('/api/tasks/search')
        .query({
          assignedTo: employeeId,
          status: 'pending',
          priority: 'high'
        })
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.tasks).toBeInstanceOf(Array)
      expect(response.body.data.total).toBeGreaterThan(0)
    })

    it('should search tasks with text search', async () => {
      const response = await request(app)
        .get('/api/tasks/search')
        .query({ search: 'priority' })
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.tasks.length).toBeGreaterThan(0)
    })

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/tasks/search')
        .query({
          limit: 1,
          offset: 0
        })
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.tasks.length).toBeLessThanOrEqual(1)
      expect(response.body.data.limit).toBe(1)
      expect(response.body.data.offset).toBe(0)
    })

    it('should filter by tags', async () => {
      const response = await request(app)
        .get('/api/tasks/search')
        .query({ tags: 'urgent,important' })
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('GET /api/tasks/my-tasks', () => {
    it('should return tasks assigned to current user', async () => {
      const response = await request(app)
        .get('/api/tasks/my-tasks')
        .set('Authorization', `Bearer ${employeeToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      
      // All returned tasks should be assigned to the current user
      response.body.data.forEach((task: any) => {
        expect(task.assignedTo).toBe(employeeId)
      })
    })

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/tasks/my-tasks')
        .query({ status: 'completed' })
        .set('Authorization', `Bearer ${employeeToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      
      response.body.data.forEach((task: any) => {
        expect(task.status).toBe('completed')
      })
    })
  })

  describe('GET /api/tasks/created-by-me', () => {
    it('should return tasks created by current user', async () => {
      const response = await request(app)
        .get('/api/tasks/created-by-me')
        .set('Authorization', `Bearer ${managerToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      
      // All returned tasks should be created by the current user
      response.body.data.forEach((task: any) => {
        expect(task.createdBy).toBe(managerId)
      })
    })
  })

  describe('GET /api/tasks/statistics', () => {
    it('should return task statistics', async () => {
      const response = await request(app)
        .get('/api/tasks/statistics')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('total')
      expect(response.body.data).toHaveProperty('pending')
      expect(response.body.data).toHaveProperty('inProgress')
      expect(response.body.data).toHaveProperty('completed')
      expect(response.body.data).toHaveProperty('byPriority')
      expect(response.body.data).toHaveProperty('byAssignee')
    })

    it('should filter statistics by assignee', async () => {
      const response = await request(app)
        .get('/api/tasks/statistics')
        .query({ assignedTo: employeeId })
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.total).toBeGreaterThan(0)
    })
  })

  describe('PATCH /api/tasks/:id/assign', () => {
    let unassignedTaskId: string

    beforeAll(async () => {
      // Create an unassigned task
      const { data: task } = await supabase
        .from('tasks')
        .insert({
          title: 'Unassigned task',
          assigned_by: managerId,
          created_by: managerId,
          status: 'pending',
          priority: 'medium'
        })
        .select()
        .single()

      unassignedTaskId = task.id
    })

    it('should assign task to user successfully', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${unassignedTaskId}/assign`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ assignedTo: employeeId })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.assignedTo).toBe(employeeId)
    })

    it('should reject assignment without proper permissions', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${unassignedTaskId}/assign`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ assignedTo: managerId })

      expect(response.status).toBe(403)
    })

    it('should reject assignment without assignee', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${unassignedTaskId}/assign`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Assignee is required')
    })
  })

  describe('PATCH /api/tasks/:id/status', () => {
    it('should update task status successfully', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ 
          status: 'in_progress',
          actualHours: 2
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe('in_progress')
    })

    it('should reject status update without status', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${testTaskId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Status is required')
    })
  })

  describe('POST /api/tasks/:id/comments', () => {
    it('should add comment to task successfully', async () => {
      const commentData = {
        comment: 'This is a test comment on the task'
      }

      const response = await request(app)
        .post(`/api/tasks/${testTaskId}/comments`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(commentData)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.comment).toBe(commentData.comment)
      expect(response.body.data.userId).toBe(employeeId)
      expect(response.body.data.taskId).toBe(testTaskId)
    })

    it('should reject empty comment', async () => {
      const response = await request(app)
        .post(`/api/tasks/${testTaskId}/comments`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ comment: '' })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Comment is required')
    })

    it('should reject comment on non-existent task', async () => {
      const response = await request(app)
        .post('/api/tasks/00000000-0000-0000-0000-000000000000/comments')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ comment: 'Test comment' })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/tasks/:id', () => {
    let deletableTaskId: string

    beforeAll(async () => {
      // Create a task that can be deleted
      const { data: task } = await supabase
        .from('tasks')
        .insert({
          title: 'Deletable task',
          assigned_by: managerId,
          created_by: managerId,
          status: 'pending',
          priority: 'low'
        })
        .select()
        .single()

      deletableTaskId = task.id
    })

    it('should delete task successfully', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${deletableTaskId}`)
        .set('Authorization', `Bearer ${managerToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Task deleted successfully')
    })

    it('should reject deletion without proper permissions', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${employeeToken}`)

      expect(response.status).toBe(403)
    })

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .delete('/api/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${managerToken}`)

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/tasks/overdue', () => {
    beforeAll(async () => {
      // Create an overdue task
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)

      await supabase.from('tasks').insert({
        title: 'Overdue task',
        assigned_to: employeeId,
        assigned_by: managerId,
        created_by: managerId,
        status: 'in_progress',
        priority: 'high',
        due_date: pastDate.toISOString().split('T')[0]
      })
    })

    it('should return overdue tasks', async () => {
      const response = await request(app)
        .get('/api/tasks/overdue')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      
      // Check that returned tasks are actually overdue
      const today = new Date().toISOString().split('T')[0]
      response.body.data.forEach((task: any) => {
        expect(new Date(task.dueDate).getTime()).toBeLessThan(new Date(today).getTime())
        expect(['pending', 'in_progress']).toContain(task.status)
      })
    })
  })
})