import { EmployeeService, CreateEmployeeData, UpdateEmployeeData } from '../../../src/services/employee.service'
import { supabase } from '../../../src/config/database'
import { EmailService } from '../../../src/services/email.service'
import { RoleService } from '../../../src/services/role.service'
import { ConflictError, NotFoundError, ValidationError } from '../../../src/utils/errors'

jest.mock('../../../src/config/database')
jest.mock('../../../src/services/email.service')
jest.mock('../../../src/services/role.service')

const mockEmailService = {
  sendEmployeeInvitationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendEmailVerificationEmail: jest.fn(),
  sendEmail: jest.fn()
}

const mockRoleService = {
  assignDefaultRole: jest.fn()
}

;(EmailService as jest.MockedClass<typeof EmailService>).mockImplementation(() => mockEmailService as any)
;(RoleService as jest.MockedClass<typeof RoleService>).mockImplementation(() => mockRoleService as any)

describe('EmployeeService', () => {
  let employeeService: EmployeeService
  let mockSupabase: jest.Mocked<typeof supabase>

  beforeEach(() => {
    jest.clearAllMocks()
    employeeService = new EmployeeService()
    mockSupabase = supabase as jest.Mocked<typeof supabase>
  })

  describe('createEmployee', () => {
    const mockEmployeeData: CreateEmployeeData = {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phoneNumber: '+1234567890',
      hireDate: '2023-01-01',
      departmentId: 'dept-123',
      positionId: 'pos-123',
      salary: 50000,
      sendInvitation: false
    }

    const mockCreatedEmployee = {
      id: 'emp-123',
      employee_id: 'EMP123456789',
      full_name: 'John Doe',
      email: 'john.doe@example.com',
      phone_number: '+1234567890',
      hire_date: '2023-01-01',
      department_id: 'dept-123',
      position_id: 'pos-123',
      salary: 50000,
      employment_status: 'active',
      skills: [],
      created_by: 'admin-123',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    }

    it('should create employee successfully', async () => {
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
              data: mockCreatedEmployee,
              error: null
            })
          })
        })
      } as any)

      const result = await employeeService.createEmployee(mockEmployeeData, 'admin-123')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Employee created successfully')
      expect(result.employee?.fullName).toBe('John Doe')
      expect(result.employee?.email).toBe('john.doe@example.com')
    })

    it('should throw ConflictError if employee email already exists', async () => {
      // Mock existing employee
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCreatedEmployee,
              error: null
            })
          })
        })
      } as any)

      await expect(employeeService.createEmployee(mockEmployeeData, 'admin-123'))
        .rejects.toThrow(ConflictError)
    })

    it('should throw ValidationError for invalid data', async () => {
      const invalidData = {
        ...mockEmployeeData,
        fullName: '',
        email: 'invalid-email'
      }

      await expect(employeeService.createEmployee(invalidData, 'admin-123'))
        .rejects.toThrow(ValidationError)
    })

    it('should send invitation when requested', async () => {
      const dataWithInvitation = {
        ...mockEmployeeData,
        sendInvitation: true
      }

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
              data: mockCreatedEmployee,
              error: null
            })
          })
        })
      } as any)

      // Mock user creation for invitation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123', email: 'john.doe@example.com' },
              error: null
            })
          })
        })
      } as any)

      // Mock employee update to link user
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      } as any)

      mockRoleService.assignDefaultRole.mockResolvedValue(undefined)
      mockEmailService.sendEmployeeInvitationEmail.mockResolvedValue(true)

      const result = await employeeService.createEmployee(dataWithInvitation, 'admin-123')

      expect(result.success).toBe(true)
      expect(result.temporaryPassword).toBeDefined()
      expect(mockEmailService.sendEmployeeInvitationEmail).toHaveBeenCalled()
      expect(mockRoleService.assignDefaultRole).toHaveBeenCalledWith('user-123')
    })
  })

  describe('getEmployeeById', () => {
    const mockEmployeeData = {
      id: 'emp-123',
      employee_id: 'EMP123456789',
      full_name: 'John Doe',
      email: 'john.doe@example.com',
      employment_status: 'active',
      department: { id: 'dept-123', name: 'Engineering' },
      position: { id: 'pos-123', title: 'Software Engineer' },
      manager: { id: 'mgr-123', full_name: 'Jane Smith', employee_id: 'EMP987654321' }
    }

    it('should return employee when found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEmployeeData,
              error: null
            })
          })
        })
      } as any)

      const result = await employeeService.getEmployeeById('emp-123')

      expect(result).toBeTruthy()
      expect(result?.fullName).toBe('John Doe')
      expect(result?.employeeId).toBe('EMP123456789')
    })

    it('should return null when employee not found', async () => {
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

      const result = await employeeService.getEmployeeById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('updateEmployee', () => {
    const mockUpdateData: UpdateEmployeeData = {
      fullName: 'John Updated',
      phoneNumber: '+9876543210',
      salary: 60000
    }

    const mockExistingEmployee = {
      id: 'emp-123',
      employee_id: 'EMP123456789',
      full_name: 'John Doe',
      email: 'john.doe@example.com',
      employment_status: 'active'
    }

    const mockUpdatedEmployee = {
      ...mockExistingEmployee,
      full_name: 'John Updated',
      phone_number: '+9876543210',
      salary: 60000
    }

    it('should update employee successfully', async () => {
      // Mock existing employee check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockExistingEmployee,
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
                data: mockUpdatedEmployee,
                error: null
              })
            })
          })
        })
      } as any)

      const result = await employeeService.updateEmployee('emp-123', mockUpdateData, 'admin-123')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Employee updated successfully')
      expect(result.employee?.fullName).toBe('John Updated')
    })

    it('should throw NotFoundError when employee does not exist', async () => {
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

      await expect(employeeService.updateEmployee('nonexistent', mockUpdateData, 'admin-123'))
        .rejects.toThrow(NotFoundError)
    })
  })

  describe('deleteEmployee', () => {
    const mockEmployee = {
      id: 'emp-123',
      employee_id: 'EMP123456789',
      full_name: 'John Doe',
      employment_status: 'active'
    }

    it('should soft delete employee successfully', async () => {
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

      // Mock employee update (soft delete)
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      } as any)

      const result = await employeeService.deleteEmployee('emp-123', 'admin-123')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Employee deleted successfully')
    })

    it('should throw NotFoundError when employee does not exist', async () => {
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

      await expect(employeeService.deleteEmployee('nonexistent', 'admin-123'))
        .rejects.toThrow(NotFoundError)
    })
  })

  describe('searchEmployees', () => {
    const mockEmployees = [
      {
        id: 'emp-1',
        employee_id: 'EMP001',
        full_name: 'John Doe',
        email: 'john@example.com',
        employment_status: 'active',
        department: { id: 'dept-1', name: 'Engineering' }
      },
      {
        id: 'emp-2',
        employee_id: 'EMP002',
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        employment_status: 'active',
        department: { id: 'dept-1', name: 'Engineering' }
      }
    ]

    it('should search employees with filters', async () => {
      // Mock the final query result directly
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

      // Mock the select method to return our query chain
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      } as any)

      const filters = {
        departmentId: 'dept-1',
        search: 'John',
        limit: 10,
        offset: 0
      }

      const result = await employeeService.searchEmployees(filters)

      expect(result.success).toBe(true)
      expect(result.employees).toBeDefined()
      expect(result.total).toBeDefined()
      // The mock data should be mapped correctly
      expect(Array.isArray(result.employees)).toBe(true)
    })

    it('should handle empty search results', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0
          })
        })
      } as any)

      const result = await employeeService.searchEmployees({ limit: 10 })

      expect(result.success).toBe(true)
      expect(result.employees).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('getEmployeesByManager', () => {
    const mockEmployees = [
      {
        id: 'emp-1',
        employee_id: 'EMP001',
        full_name: 'John Doe',
        manager_id: 'mgr-123',
        employment_status: 'active'
      }
    ]

    it('should return employees by manager', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockEmployees,
              error: null
            })
          })
        })
      } as any)

      const result = await employeeService.getEmployeesByManager('mgr-123')

      expect(result).toHaveLength(1)
      expect(result[0].fullName).toBe('John Doe')
    })

    it('should return empty array on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any)

      const result = await employeeService.getEmployeesByManager('mgr-123')

      expect(result).toEqual([])
    })
  })

  describe('getEmployeesByDepartment', () => {
    const mockEmployees = [
      {
        id: 'emp-1',
        employee_id: 'EMP001',
        full_name: 'John Doe',
        department_id: 'dept-123',
        employment_status: 'active'
      }
    ]

    it('should return employees by department', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockEmployees,
              error: null
            })
          })
        })
      } as any)

      const result = await employeeService.getEmployeesByDepartment('dept-123')

      expect(result).toHaveLength(1)
      expect(result[0].fullName).toBe('John Doe')
    })
  })

  describe('validation', () => {
    it('should validate required fields', async () => {
      const invalidData = {
        fullName: '',
        email: '',
        hireDate: ''
      } as CreateEmployeeData

      await expect(employeeService.createEmployee(invalidData, 'admin-123'))
        .rejects.toThrow(ValidationError)
    })

    it('should validate email format', async () => {
      const invalidData = {
        fullName: 'John Doe',
        email: 'invalid-email',
        hireDate: '2023-01-01'
      } as CreateEmployeeData

      await expect(employeeService.createEmployee(invalidData, 'admin-123'))
        .rejects.toThrow(ValidationError)
    })

    it('should validate salary is positive', async () => {
      const invalidData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        hireDate: '2023-01-01',
        salary: -1000
      } as CreateEmployeeData

      await expect(employeeService.createEmployee(invalidData, 'admin-123'))
        .rejects.toThrow(ValidationError)
    })
  })
})