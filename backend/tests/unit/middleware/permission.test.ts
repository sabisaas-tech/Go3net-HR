import { Request, Response, NextFunction } from 'express'
import { PermissionMiddleware, AuthenticatedRequest } from '../../../src/middleware/permission'
import { RoleService } from '../../../src/services/role.service'
import { AuthorizationError } from '../../../src/utils/errors'

jest.mock('../../../src/services/role.service')

describe('PermissionMiddleware', () => {
  let permissionMiddleware: PermissionMiddleware
  let mockRoleService: jest.Mocked<RoleService>
  let mockRequest: Partial<AuthenticatedRequest>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    permissionMiddleware = new PermissionMiddleware()
    mockRoleService = new RoleService() as jest.Mocked<RoleService>
    ;(permissionMiddleware as any).roleService = mockRoleService

    mockRequest = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'employee'
      },
      params: {},
      body: {},
      query: {}
    }

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }

    mockNext = jest.fn()
    jest.clearAllMocks()
  })

  describe('requirePermission', () => {
    it('should allow access when user has permission', async () => {
      mockRoleService.validatePermission.mockResolvedValue(true)

      const middleware = permissionMiddleware.requirePermission('employee.read')
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.validatePermission).toHaveBeenCalledWith('user-123', 'employee.read')
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should deny access when user lacks permission', async () => {
      mockRoleService.validatePermission.mockResolvedValue(false)

      const middleware = permissionMiddleware.requirePermission('employee.delete')
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.validatePermission).toHaveBeenCalledWith('user-123', 'employee.delete')
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(403)
    })

    it('should deny access when user is not authenticated', async () => {
      mockRequest.user = undefined

      const middleware = permissionMiddleware.requirePermission('employee.read')
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.validatePermission).not.toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(403)
    })

    it('should handle validation errors gracefully', async () => {
      mockRoleService.validatePermission.mockRejectedValue(new Error('Database error'))

      const middleware = permissionMiddleware.requirePermission('employee.read')
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(403)
    })
  })

  describe('requireAnyPermission', () => {
    it('should allow access when user has any of the permissions', async () => {
      mockRoleService.validatePermission
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)

      const middleware = permissionMiddleware.requireAnyPermission(['employee.create', 'employee.read'])
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.validatePermission).toHaveBeenCalledTimes(2)
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should deny access when user has none of the permissions', async () => {
      mockRoleService.validatePermission.mockResolvedValue(false)

      const middleware = permissionMiddleware.requireAnyPermission(['employee.create', 'employee.delete'])
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.validatePermission).toHaveBeenCalledTimes(2)
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(403)
    })
  })

  describe('requireAllPermissions', () => {
    it('should allow access when user has all permissions', async () => {
      mockRoleService.validatePermission.mockResolvedValue(true)

      const middleware = permissionMiddleware.requireAllPermissions(['employee.read', 'employee.update'])
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.validatePermission).toHaveBeenCalledTimes(2)
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should deny access when user lacks any permission', async () => {
      mockRoleService.validatePermission
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)

      const middleware = permissionMiddleware.requireAllPermissions(['employee.read', 'employee.delete'])
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.validatePermission).toHaveBeenCalledTimes(2)
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(403)
    })
  })

  describe('requireResourcePermission', () => {
    it('should allow access with valid resource permission', async () => {
      mockRoleService.validateResourceAccess.mockResolvedValue(true)

      const middleware = permissionMiddleware.requireResourcePermission({
        resource: 'employee',
        action: 'read',
        scope: 'team'
      })
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.validateResourceAccess).toHaveBeenCalledWith('user-123', 'employee', 'read', 'team')
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should allow self-access when allowSelf is true', async () => {
      mockRequest.params = { userId: 'user-123' }

      const middleware = permissionMiddleware.requireResourcePermission({
        resource: 'profile',
        action: 'update',
        allowSelf: true
      })
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.validateResourceAccess).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should deny access when resource permission is insufficient', async () => {
      mockRoleService.validateResourceAccess.mockResolvedValue(false)

      const middleware = permissionMiddleware.requireResourcePermission({
        resource: 'employee',
        action: 'delete'
      })
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.validateResourceAccess).toHaveBeenCalledWith('user-123', 'employee', 'delete', 'any')
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(403)
    })
  })

  describe('requireMinimumRole', () => {
    it('should allow access when user has sufficient role level', async () => {
      const mockRole = {
        id: 'role-123',
        userId: 'user-123',
        roleName: 'manager',
        permissions: ['employee.read'],
        assignedAt: '2023-01-01',
        isActive: true
      }

      mockRoleService.getActiveRole.mockResolvedValue(mockRole)
      mockRoleService.getRoleLevel.mockReturnValueOnce(3).mockReturnValueOnce(2)

      const middleware = permissionMiddleware.requireMinimumRole('hr-staff')
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.getActiveRole).toHaveBeenCalledWith('user-123')
      expect(mockRoleService.getRoleLevel).toHaveBeenCalledWith('manager')
      expect(mockRoleService.getRoleLevel).toHaveBeenCalledWith('hr-staff')
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should deny access when user has insufficient role level', async () => {
      const mockRole = {
        id: 'role-123',
        userId: 'user-123',
        roleName: 'employee',
        permissions: ['profile.read'],
        assignedAt: '2023-01-01',
        isActive: true
      }

      mockRoleService.getActiveRole.mockResolvedValue(mockRole)
      mockRoleService.getRoleLevel.mockReturnValueOnce(1).mockReturnValueOnce(3)

      const middleware = permissionMiddleware.requireMinimumRole('manager')
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(403)
    })

    it('should deny access when user has no active role', async () => {
      mockRoleService.getActiveRole.mockResolvedValue(null)

      const middleware = permissionMiddleware.requireMinimumRole('employee')
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(403)
    })
  })

  describe('requireRoleAssignmentPermission', () => {
    it('should allow role assignment when user can assign target role', async () => {
      mockRequest.body = { roleName: 'employee' }
      mockRoleService.canAssignRole.mockResolvedValue(true)

      const middleware = permissionMiddleware.requireRoleAssignmentPermission()
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.canAssignRole).toHaveBeenCalledWith('user-123', 'employee')
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should deny role assignment when user cannot assign target role', async () => {
      mockRequest.body = { roleName: 'super-admin' }
      mockRoleService.canAssignRole.mockResolvedValue(false)

      const middleware = permissionMiddleware.requireRoleAssignmentPermission()
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.canAssignRole).toHaveBeenCalledWith('user-123', 'super-admin')
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(403)
    })

    it('should use provided target role parameter', async () => {
      mockRoleService.canAssignRole.mockResolvedValue(true)

      const middleware = permissionMiddleware.requireRoleAssignmentPermission('manager')
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.canAssignRole).toHaveBeenCalledWith('user-123', 'manager')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should deny when target role is not specified', async () => {
      const middleware = permissionMiddleware.requireRoleAssignmentPermission()
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.canAssignRole).not.toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(403)
    })
  })

  describe('utility methods', () => {
    describe('checkPermission', () => {
      it('should return true when user has permission', async () => {
        mockRoleService.validatePermission.mockResolvedValue(true)

        const result = await permissionMiddleware.checkPermission('user-123', 'employee.read')

        expect(result).toBe(true)
        expect(mockRoleService.validatePermission).toHaveBeenCalledWith('user-123', 'employee.read')
      })

      it('should return false when user lacks permission', async () => {
        mockRoleService.validatePermission.mockResolvedValue(false)

        const result = await permissionMiddleware.checkPermission('user-123', 'employee.delete')

        expect(result).toBe(false)
      })

      it('should return false on error', async () => {
        mockRoleService.validatePermission.mockRejectedValue(new Error('Database error'))

        const result = await permissionMiddleware.checkPermission('user-123', 'employee.read')

        expect(result).toBe(false)
      })
    })

    describe('checkResourceAccess', () => {
      it('should return true when user has resource access', async () => {
        mockRoleService.validateResourceAccess.mockResolvedValue(true)

        const result = await permissionMiddleware.checkResourceAccess('user-123', 'employee', 'read', 'team')

        expect(result).toBe(true)
        expect(mockRoleService.validateResourceAccess).toHaveBeenCalledWith('user-123', 'employee', 'read', 'team')
      })

      it('should return false when user lacks resource access', async () => {
        mockRoleService.validateResourceAccess.mockResolvedValue(false)

        const result = await permissionMiddleware.checkResourceAccess('user-123', 'employee', 'delete')

        expect(result).toBe(false)
      })

      it('should use default scope when not provided', async () => {
        mockRoleService.validateResourceAccess.mockResolvedValue(true)

        await permissionMiddleware.checkResourceAccess('user-123', 'employee', 'read')

        expect(mockRoleService.validateResourceAccess).toHaveBeenCalledWith('user-123', 'employee', 'read', 'any')
      })
    })

    describe('getUserRole', () => {
      it('should return user role when found', async () => {
        const mockRole = {
          id: 'role-123',
          userId: 'user-123',
          roleName: 'manager',
          permissions: ['employee.read'],
          assignedAt: '2023-01-01',
          isActive: true
        }

        mockRoleService.getActiveRole.mockResolvedValue(mockRole)

        const result = await permissionMiddleware.getUserRole('user-123')

        expect(result).toEqual(mockRole)
        expect(mockRoleService.getActiveRole).toHaveBeenCalledWith('user-123')
      })

      it('should return null when role not found', async () => {
        mockRoleService.getActiveRole.mockResolvedValue(null)

        const result = await permissionMiddleware.getUserRole('user-123')

        expect(result).toBeNull()
      })

      it('should return null on error', async () => {
        mockRoleService.getActiveRole.mockRejectedValue(new Error('Database error'))

        const result = await permissionMiddleware.getUserRole('user-123')

        expect(result).toBeNull()
      })
    })
  })

  describe('self-access detection', () => {
    it('should detect self-access from params.userId', async () => {
      mockRequest.params = { userId: 'user-123' }

      const middleware = permissionMiddleware.requireResourcePermission({
        resource: 'profile',
        action: 'read',
        allowSelf: true
      })
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRoleService.validateResourceAccess).not.toHaveBeenCalled()
    })

    it('should detect self-access from params.id', async () => {
      mockRequest.params = { id: 'user-123' }

      const middleware = permissionMiddleware.requireResourcePermission({
        resource: 'profile',
        action: 'read',
        allowSelf: true
      })
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRoleService.validateResourceAccess).not.toHaveBeenCalled()
    })

    it('should detect self-access from body.userId', async () => {
      mockRequest.body = { userId: 'user-123' }

      const middleware = permissionMiddleware.requireResourcePermission({
        resource: 'profile',
        action: 'update',
        allowSelf: true
      })
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockRoleService.validateResourceAccess).not.toHaveBeenCalled()
    })

    it('should not allow self-access when allowSelf is false', async () => {
      mockRequest.params = { userId: 'user-123' }
      mockRoleService.validateResourceAccess.mockResolvedValue(false)

      const middleware = permissionMiddleware.requireResourcePermission({
        resource: 'profile',
        action: 'read',
        allowSelf: false
      })
      await middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

      expect(mockRoleService.validateResourceAccess).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(403)
    })
  })
})