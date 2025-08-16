import { RoleService } from '../../../src/services/role.service'
import { supabase } from '../../../src/config/database'

jest.mock('../../../src/config/database')

describe('RoleService', () => {
  let roleService: RoleService
  let mockSupabase: jest.Mocked<typeof supabase>

  beforeEach(() => {
    roleService = new RoleService()
    mockSupabase = supabase as jest.Mocked<typeof supabase>
    jest.clearAllMocks()
  })

  describe('assignDefaultRole', () => {
    it('should assign default employee role to new user', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'No existing role' }
              })
            })
          })
        })
      } as any)

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'role-123',
                user_id: 'user-123',
                role_name: 'employee',
                is_active: true
              },
              error: null
            })
          })
        })
      } as any)

      const result = await roleService.assignDefaultRole('user-123')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Default employee role assigned successfully')
      expect(result.role).toBeDefined()
    })

    it('should return existing role if user already has one', async () => {
      const existingRole = {
        id: 'role-123',
        user_id: 'user-123',
        role_name: 'manager',
        is_active: true
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: existingRole,
                error: null
              })
            })
          })
        })
      } as any)

      const result = await roleService.assignDefaultRole('user-123')

      expect(result.success).toBe(true)
      expect(result.message).toBe('User already has an active role')
      expect(result.role).toEqual(existingRole)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockRejectedValue(new Error('Database error'))
            })
          })
        })
      } as any)

      const result = await roleService.assignDefaultRole('user-123')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to assign default role')
    })
  })

  describe('assignRole', () => {
    beforeEach(() => {
      jest.spyOn(roleService, 'canAssignRole').mockResolvedValue(true)
    })

    it('should assign valid role to user', async () => {
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      } as any)

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'role-123',
                user_id: 'user-123',
                role_name: 'manager',
                is_active: true
              },
              error: null
            })
          })
        })
      } as any)

      const result = await roleService.assignRole('user-123', 'manager', 'admin-123')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Role manager assigned successfully')
      expect(result.role).toBeDefined()
    })

    it('should reject invalid role names', async () => {
      const result = await roleService.assignRole('user-123', 'invalid-role', 'admin-123')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid role name')
    })

    it('should reject assignment when user lacks permissions', async () => {
      jest.spyOn(roleService, 'canAssignRole').mockResolvedValue(false)

      const result = await roleService.assignRole('user-123', 'manager', 'employee-123')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Insufficient permissions to assign this role')
    })

    it('should handle database errors during role assignment', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      } as any)

      const result = await roleService.assignRole('user-123', 'manager', 'admin-123')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to assign role')
    })
  })

  describe('getUserRoles', () => {
    it('should return user roles successfully', async () => {
      const mockRoles = [
        {
          id: 'role-123',
          user_id: 'user-123',
          role_name: 'employee',
          is_active: true
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockRoles,
              error: null
            })
          })
        })
      } as any)

      const result = await roleService.getUserRoles('user-123')

      expect(result).toEqual(mockRoles)
    })

    it('should return empty array on database error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      } as any)

      const result = await roleService.getUserRoles('user-123')

      expect(result).toEqual([])
    })
  })

  describe('getActiveRole', () => {
    it('should return active role for user', async () => {
      const mockRole = {
        id: 'role-123',
        user_id: 'user-123',
        role_name: 'manager',
        permissions: ['employee.read', 'team.manage'],
        is_active: true
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockRole,
                error: null
              })
            })
          })
        })
      } as any)

      const result = await roleService.getActiveRole('user-123')

      expect(result).toEqual(mockRole)
    })

    it('should return null when no active role found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'No role found' }
              })
            })
          })
        })
      } as any)

      const result = await roleService.getActiveRole('user-123')

      expect(result).toBeNull()
    })
  })

  describe('validatePermission', () => {
    it('should return true for super admin with wildcard permission', async () => {
      jest.spyOn(roleService, 'getActiveRole').mockResolvedValue({
        id: 'role-123',
        userId: 'user-123',
        roleName: 'super-admin',
        permissions: ['*'],
        assignedAt: '2024-01-01',
        isActive: true
      })

      const result = await roleService.validatePermission('user-123', 'any.permission')

      expect(result).toBe(true)
    })

    it('should return true when user has specific permission', async () => {
      jest.spyOn(roleService, 'getActiveRole').mockResolvedValue({
        id: 'role-123',
        userId: 'user-123',
        roleName: 'manager',
        permissions: ['employee.read', 'team.manage'],
        assignedAt: '2024-01-01',
        isActive: true
      })

      const result = await roleService.validatePermission('user-123', 'employee.read')

      expect(result).toBe(true)
    })

    it('should return false when user lacks permission', async () => {
      jest.spyOn(roleService, 'getActiveRole').mockResolvedValue({
        id: 'role-123',
        userId: 'user-123',
        roleName: 'employee',
        permissions: ['profile.read', 'profile.update'],
        assignedAt: '2024-01-01',
        isActive: true
      })

      const result = await roleService.validatePermission('user-123', 'employee.delete')

      expect(result).toBe(false)
    })

    it('should return false when user has no active role', async () => {
      jest.spyOn(roleService, 'getActiveRole').mockResolvedValue(null)

      const result = await roleService.validatePermission('user-123', 'any.permission')

      expect(result).toBe(false)
    })
  })

  describe('canAssignRole', () => {
    it('should allow super admin to assign any role', async () => {
      jest.spyOn(roleService, 'getActiveRole').mockResolvedValue({
        id: 'role-123',
        userId: 'admin-123',
        roleName: 'super-admin',
        permissions: ['*'],
        assignedAt: '2024-01-01',
        isActive: true
      })

      const result = await roleService.canAssignRole('admin-123', 'hr-admin')

      expect(result).toBe(true)
    })

    it('should allow higher level roles to assign lower level roles', async () => {
      jest.spyOn(roleService, 'getActiveRole').mockResolvedValue({
        id: 'role-123',
        userId: 'hr-admin-123',
        roleName: 'hr-admin',
        permissions: ['roles.assign'],
        assignedAt: '2024-01-01',
        isActive: true
      })

      const result = await roleService.canAssignRole('hr-admin-123', 'manager')

      expect(result).toBe(true)
    })

    it('should prevent lower level roles from assigning higher level roles', async () => {
      jest.spyOn(roleService, 'getActiveRole').mockResolvedValue({
        id: 'role-123',
        userId: 'manager-123',
        roleName: 'manager',
        permissions: ['roles.assign'],
        assignedAt: '2024-01-01',
        isActive: true
      })

      const result = await roleService.canAssignRole('manager-123', 'hr-admin')

      expect(result).toBe(false)
    })

    it('should prevent assignment without roles.assign permission', async () => {
      jest.spyOn(roleService, 'getActiveRole').mockResolvedValue({
        id: 'role-123',
        userId: 'employee-123',
        roleName: 'employee',
        permissions: ['profile.read'],
        assignedAt: '2024-01-01',
        isActive: true
      })

      const result = await roleService.canAssignRole('employee-123', 'employee')

      expect(result).toBe(false)
    })
  })

  describe('getRoleHierarchy', () => {
    it('should return complete role hierarchy', () => {
      const hierarchy = roleService.getRoleHierarchy()

      expect(hierarchy).toHaveProperty('super-admin')
      expect(hierarchy).toHaveProperty('hr-admin')
      expect(hierarchy).toHaveProperty('manager')
      expect(hierarchy).toHaveProperty('hr-staff')
      expect(hierarchy).toHaveProperty('employee')
      expect(hierarchy['super-admin'].level).toBe(5)
      expect(hierarchy['employee'].level).toBe(1)
    })
  })

  describe('getAvailableRoles', () => {
    it('should return list of available role names', () => {
      const roles = roleService.getAvailableRoles()

      expect(roles).toContain('super-admin')
      expect(roles).toContain('hr-admin')
      expect(roles).toContain('manager')
      expect(roles).toContain('hr-staff')
      expect(roles).toContain('employee')
      expect(roles).toHaveLength(5)
    })
  })

  describe('getRolePermissions', () => {
    it('should return permissions for valid role', () => {
      const permissions = roleService.getRolePermissions('manager')

      expect(permissions).toContain('employee.read')
      expect(permissions).toContain('team.manage')
      expect(permissions).toContain('performance.manage')
    })

    it('should return empty array for invalid role', () => {
      const permissions = roleService.getRolePermissions('invalid-role')

      expect(permissions).toEqual([])
    })
  })

  describe('getRoleLevel', () => {
    it('should return correct level for valid role', () => {
      expect(roleService.getRoleLevel('super-admin')).toBe(5)
      expect(roleService.getRoleLevel('hr-admin')).toBe(4)
      expect(roleService.getRoleLevel('manager')).toBe(3)
      expect(roleService.getRoleLevel('hr-staff')).toBe(2)
      expect(roleService.getRoleLevel('employee')).toBe(1)
    })

    it('should return 0 for invalid role', () => {
      expect(roleService.getRoleLevel('invalid-role')).toBe(0)
    })
  })
})