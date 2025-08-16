import request from 'supertest'
import app from '../../src/server'
import { supabase } from '../../src/config/database'
import { generateTokens } from '../../src/utils/jwt'

jest.mock('../../src/config/database')

describe('Employee Management API', () => {
  let authToken: string
  let hrAdminToken: string
  let employeeToken: string
  let mockSupabase: jest.Mocked<typeof supabase>

  const mockEmployee = {
    id: 'emp-123',
    employee_id: 'EMP123456789',
    full_name: 'John Doe',
    email: 'john.doe@example.com',
    phone_number: '+1234567890',
    hire_date: '2023-01-01',
    employment_status: 'active',
    department_id: 'dept-123',
    position_id: 'pos-123',
    salary: 50000,
    created_by: 'admin-123',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  }

  beforeAll(() => {
    // Generate test tokens
    const adminPayload = { userId: 'admin-123', email: 'admin@example.com', role: 'hr-admin' }
    const hrPayload = { userId: 'hr-123', email: 'hr@example.com', role: 'hr-staff' }
    const empPayload = { userId: 'emp-123', email: 'employee@example.com', role: 'employee' }

    authToken = generateTokens(adminPayload).accessToken
    hrAdminToken = generateTokens(hrPayload).accessToken
    employeeToken = generateTokens(empPayload).accessToken
  })

  beforeEach(() => {
    mockSupabase = supabase as jest.Mocked<typeof supabase>
    jest.clearAllMocks()
  })

  describe('POST /api/employees', () => {
    const newEmployeeData = {
      fullName: 'Jane Smith',
      email: 'jane.smith@example.com',
      phoneNumber: '+9876543210',
      hireDate: '2023-06-01',
      departmentId: 'dept-456',
      positionId: 'pos-456',
      salary: 60000
    }

    it('should create employee successfully with HR admin permissions', async () => {
      // Mock email check (no existing employee)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'No employee found' }
            })
          })
        })
      } as any)

      // Mock employee creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockEmployee, ...newEmployeeData },
              error: null
            })
          })
        })
      } as any)

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newEmployeeData)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.employee.fullName).toBe('Jane Smith')
    })

    it('should return 403 for employee without create permissions', async () => {
      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(newEmployeeData)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })

    it('should return 400 for invalid employee data', async () => {
      const invalidData = {
        fullName: '',
        email: 'invalid-email',
        hireDate: ''
      }

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/employees')
        .send(newEmployeeData)

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/employees', () => {
    const mockEmployees = [
      mockEmployee,
      {
        ...mockEmployee,
        id: 'emp-456',
        employee_id: 'EMP456789123',
        full_name: 'Jane Smith',
        email: 'jane.smith@example.com'
      }
    ]

    it('should get employees with HR permissions', async () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockEmployees,
          error: null,
          count: 2
        })
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      } as any)

      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.employees).toBeDefined()
      expect(response.body.data.total).toBe(2)
    })

    it('should support filtering by department', async () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockEmployee],
          error: null,
          count: 1
        })
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      } as any)

      const response = await request(app)
        .get('/api/employees?departmentId=dept-123')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('should support pagination', async () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockEmployee],
          error: null,
          count: 1
        })
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      } as any)

      const response = await request(app)
        .get('/api/employees?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.limit).toBe(10)
      expect(response.body.data.offset).toBe(0)
    })

    it('should return 403 for employee without read permissions', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${employeeToken}`)

      expect(response.status).toBe(403)
    })
  })

  describe('GET /api/employees/:id', () => {
    it('should get employee by ID with proper permissions', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEmployee,
              error: null
            })
          })
        })
      } as any)

      const response = await request(app)
        .get('/api/employees/emp-123')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.employee.id).toBe('emp-123')
    })

    it('should return 404 for non-existent employee', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Employee not found' }
            })
          })
        })
      } as any)

      const response = await request(app)
        .get('/api/employees/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })
  })

  describe('PUT /api/employees/:id', () => {
    const updateData = {
      fullName: 'John Updated',
      phoneNumber: '+1111111111',
      salary: 55000
    }

    it('should update employee with proper permissions', async () => {
      // Mock existing employee check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEmployee,
              error: null
            })
          })
        })
      } as any)

      // Mock employee update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockEmployee, ...updateData },
                error: null
              })
            })
          })
        })
      } as any)

      const response = await request(app)
        .put('/api/employees/emp-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.employee.fullName).toBe('John Updated')
    })

    it('should return 404 for non-existent employee', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Employee not found' }
            })
          })
        })
      } as any)

      const response = await request(app)
        .put('/api/employees/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/employees/:id', () => {
    it('should delete employee with proper permissions', async () => {
      // Mock existing employee check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEmployee,
              error: null
            })
          })
        })
      } as any)

      // Mock employee soft delete
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      } as any)

      const response = await request(app)
        .delete('/api/employees/emp-123')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('should return 403 for employee without delete permissions', async () => {
      const response = await request(app)
        .delete('/api/employees/emp-123')
        .set('Authorization', `Bearer ${employeeToken}`)

      expect(response.status).toBe(403)
    })
  })

  describe('GET /api/employees/statistics', () => {
    it('should get employee statistics with proper permissions', async () => {
      const mockQuery = {
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [
            { ...mockEmployee, employment_status: 'active' },
            { ...mockEmployee, id: 'emp-456', employment_status: 'inactive' }
          ],
          error: null,
          count: 2
        })
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      } as any)

      const response = await request(app)
        .get('/api/employees/statistics')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.statistics).toBeDefined()
      expect(response.body.data.statistics.total).toBe(2)
      expect(response.body.data.statistics.active).toBe(1)
      expect(response.body.data.statistics.inactive).toBe(1)
    })
  })

  describe('GET /api/employees/org-structure', () => {
    it('should get organizational structure with proper permissions', async () => {
      const mockEmployees = [
        { ...mockEmployee, manager_id: null }, // Root employee
        { ...mockEmployee, id: 'emp-456', manager_id: 'emp-123' } // Subordinate
      ]

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockEmployees,
          error: null,
          count: 2
        })
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      } as any)

      const response = await request(app)
        .get('/api/employees/org-structure')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.structure).toBeDefined()
      expect(response.body.data.totalEmployees).toBe(2)
    })
  })

  describe('POST /api/employees/:id/invite', () => {
    it('should send invitation with HR staff permissions', async () => {
      // Mock get employee
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockEmployee, user_id: null },
              error: null
            })
          })
        })
      } as any)

      // Mock email check (no existing employee)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'No employee found' }
            })
          })
        })
      } as any)

      // Mock employee creation with invitation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEmployee,
              error: null
            })
          })
        })
      } as any)

      const response = await request(app)
        .post('/api/employees/emp-123/invite')
        .set('Authorization', `Bearer ${hrAdminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('should return 403 for employee without HR permissions', async () => {
      const response = await request(app)
        .post('/api/employees/emp-123/invite')
        .set('Authorization', `Bearer ${employeeToken}`)

      expect(response.status).toBe(403)
    })

    it('should return 404 for non-existent employee', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Employee not found' }
            })
          })
        })
      } as any)

      const response = await request(app)
        .post('/api/employees/nonexistent/invite')
        .set('Authorization', `Bearer ${hrAdminToken}`)

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/employees/manager/:managerId', () => {
    it('should get employees by manager with proper permissions', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [mockEmployee],
              error: null
            })
          })
        })
      } as any)

      const response = await request(app)
        .get('/api/employees/manager/mgr-123')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.employees).toBeDefined()
    })
  })

  describe('GET /api/employees/department/:departmentId', () => {
    it('should get employees by department with proper permissions', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [mockEmployee],
              error: null
            })
          })
        })
      } as any)

      const response = await request(app)
        .get('/api/employees/department/dept-123')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.employees).toBeDefined()
    })
  })
})