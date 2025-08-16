import { systemService } from '../../../src/services/system.service'
import { supabase } from '../../../src/config/database'
import bcrypt from 'bcryptjs'

// Mock dependencies
jest.mock('../../../src/config/database')
jest.mock('bcryptjs')

const mockSupabase = supabase as jest.Mocked<typeof supabase>
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>

describe('SystemService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initializeSystem', () => {
    it('should initialize system with super admin user', async () => {
      const initData = {
        adminEmail: 'admin@example.com',
        adminPassword: 'SecurePassword123!',
        adminFullName: 'System Administrator',
        companyName: 'Test Company'
      }

      // Mock password hashing
      mockBcrypt.hash.mockResolvedValue('hashedPassword123' as never)

      // Mock user creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{
              id: 'admin-123',
              email: 'admin@example.com',
              full_name: 'System Administrator',
              employee_id: 'EMP-001'
            }],
            error: null
          })
        })
      } as any)

      // Mock role assignment
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null
        })
      } as any)

      // Mock system settings creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null
        })
      } as any)

      const result = await systemService.initializeSystem(initData)

      expect(result.success).toBe(true)
      expect(result.adminUser).toBeDefined()
      expect(result.adminUser.email).toBe('admin@example.com')
      expect(mockBcrypt.hash).toHaveBeenCalledWith('SecurePassword123!', 12)
    })

    it('should return error if admin user creation fails', async () => {
      const initData = {
        adminEmail: 'admin@example.com',
        adminPassword: 'password',
        adminFullName: 'Admin',
        companyName: 'Test Company'
      }

      mockBcrypt.hash.mockResolvedValue('hashedPassword' as never)

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'User creation failed' }
          })
        })
      } as any)

      const result = await systemService.initializeSystem(initData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create admin user')
    })

    it('should handle role assignment failure', async () => {
      const initData = {
        adminEmail: 'admin@example.com',
        adminPassword: 'password',
        adminFullName: 'Admin',
        companyName: 'Test Company'
      }

      mockBcrypt.hash.mockResolvedValue('hashedPassword' as never)

      // Mock successful user creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{ id: 'admin-123', email: 'admin@example.com' }],
            error: null
          })
        })
      } as any)

      // Mock role assignment failure
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: { message: 'Role assignment failed' }
        })
      } as any)

      const result = await systemService.initializeSystem(initData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to assign admin role')
    })
  })

  describe('checkSystemStatus', () => {
    it('should return initialized status when admin exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'admin-123' },
                error: null
              })
            })
          })
        })
      } as any)

      const status = await systemService.checkSystemStatus()

      expect(status.isInitialized).toBe(true)
      expect(status.hasAdminUser).toBe(true)
    })

    it('should return not initialized status when no admin exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' } // No rows returned
              })
            })
          })
        })
      } as any)

      const status = await systemService.checkSystemStatus()

      expect(status.isInitialized).toBe(false)
      expect(status.hasAdminUser).toBe(false)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            })
          })
        })
      } as any)

      const status = await systemService.checkSystemStatus()

      expect(status.isInitialized).toBe(false)
      expect(status.hasAdminUser).toBe(false)
      expect(status.error).toBe('Failed to check system status')
    })
  })

  describe('getSystemSettings', () => {
    it('should return system settings', async () => {
      const mockSettings = {
        company_name: 'Test Company',
        timezone: 'UTC',
        date_format: 'YYYY-MM-DD',
        working_hours: { start: '09:00', end: '17:00' }
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSettings,
            error: null
          })
        })
      } as any)

      const settings = await systemService.getSystemSettings()

      expect(settings).toEqual({
        companyName: 'Test Company',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        workingHours: { start: '09:00', end: '17:00' }
      })
    })

    it('should return default settings when none exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }
          })
        })
      } as any)

      const settings = await systemService.getSystemSettings()

      expect(settings).toEqual({
        companyName: 'Go3net HR System',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        workingHours: { start: '09:00', end: '17:00' },
        allowSelfRegistration: false,
        requireEmailVerification: true
      })
    })
  })

  describe('updateSystemSettings', () => {
    it('should update system settings successfully', async () => {
      const newSettings = {
        companyName: 'Updated Company',
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY'
      }

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          error: null
        })
      } as any)

      const result = await systemService.updateSystemSettings(newSettings)

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('system_settings')
    })

    it('should handle update errors', async () => {
      const newSettings = {
        companyName: 'Updated Company'
      }

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({
          error: { message: 'Update failed' }
        })
      } as any)

      const result = await systemService.updateSystemSettings(newSettings)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update system settings')
    })
  })

  describe('generateEmployeeId', () => {
    it('should generate unique employee ID', async () => {
      // Mock count query to return existing count
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ count: 5 }],
            error: null
          })
        })
      } as any)

      const employeeId = await systemService.generateEmployeeId()

      expect(employeeId).toMatch(/^EMP-\d{3}$/)
    })

    it('should handle database errors when generating employee ID', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      } as any)

      const employeeId = await systemService.generateEmployeeId()

      expect(employeeId).toMatch(/^EMP-\d{3}$/) // Should still generate an ID
    })
  })

  describe('validateSystemData', () => {
    it('should validate correct initialization data', () => {
      const validData = {
        adminEmail: 'admin@example.com',
        adminPassword: 'SecurePassword123!',
        adminFullName: 'System Administrator',
        companyName: 'Test Company'
      }

      const result = systemService.validateSystemData(validData)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid email format', () => {
      const invalidData = {
        adminEmail: 'invalid-email',
        adminPassword: 'SecurePassword123!',
        adminFullName: 'Admin',
        companyName: 'Company'
      }

      const result = systemService.validateSystemData(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid email format')
    })

    it('should reject weak passwords', () => {
      const invalidData = {
        adminEmail: 'admin@example.com',
        adminPassword: 'weak',
        adminFullName: 'Admin',
        companyName: 'Company'
      }

      const result = systemService.validateSystemData(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should reject missing required fields', () => {
      const invalidData = {
        adminEmail: '',
        adminPassword: 'SecurePassword123!',
        adminFullName: '',
        companyName: 'Company'
      }

      const result = systemService.validateSystemData(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Admin email is required')
      expect(result.errors).toContain('Admin full name is required')
    })
  })

  describe('createDefaultDepartments', () => {
    it('should create default departments', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: null
        })
      } as any)

      const result = await systemService.createDefaultDepartments()

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('departments')
    })

    it('should handle department creation errors', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: { message: 'Creation failed' }
        })
      } as any)

      const result = await systemService.createDefaultDepartments()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create default departments')
    })
  })

  describe('createDefaultPositions', () => {
    it('should create default positions', async () => {
      // Mock department fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [
            { id: 'dept-1', name: 'Human Resources' },
            { id: 'dept-2', name: 'Engineering' }
          ],
          error: null
        })
      } as any)

      // Mock position creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null
        })
      } as any)

      const result = await systemService.createDefaultPositions()

      expect(result.success).toBe(true)
    })

    it('should handle position creation errors', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          data: [],
          error: { message: 'Fetch failed' }
        })
      } as any)

      const result = await systemService.createDefaultPositions()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create default positions')
    })
  })

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const initData = {
        adminEmail: 'admin@example.com',
        adminPassword: 'password',
        adminFullName: 'Admin',
        companyName: 'Company'
      }

      mockBcrypt.hash.mockRejectedValue(new Error('Hashing failed'))

      const result = await systemService.initializeSystem(initData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle Supabase connection errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection failed')
      })

      const status = await systemService.checkSystemStatus()

      expect(status.isInitialized).toBe(false)
      expect(status.error).toBeDefined()
    })
  })
})