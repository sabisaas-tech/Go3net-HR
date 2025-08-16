import { Request, Response, NextFunction } from 'express'
import { RoleService } from '../services/role.service'
import { AuthorizationError } from '../utils/errors'
import { ResponseHandler } from '../utils/response'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role?: string
  }
}

export interface PermissionOptions {
  resource: string
  action: string
  scope?: string
  allowSelf?: boolean
  requireAll?: boolean
}

export class PermissionMiddleware {
  private roleService: RoleService

  constructor() {
    this.roleService = new RoleService()
  }


  requirePermission(permission: string) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user?.id) {
          return ResponseHandler.forbidden(res, 'Authentication required')
        }
        // Super-admin token bypass
        if (req.user.role === 'super-admin') {
          return next()
        }

        const hasPermission = await this.roleService.validatePermission(req.user.id, permission)
        
        if (!hasPermission) {
          return ResponseHandler.forbidden(res, `Permission denied: ${permission}`)
        }

        next()
      } catch (error) {
        return ResponseHandler.forbidden(res, 'Permission validation failed')
      }
    }
  }

  requireAnyPermission(permissions: string[]) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user?.id) {
          return ResponseHandler.forbidden(res, 'Authentication required')
        }
        // Super-admin token bypass
        if (req.user.role === 'super-admin') {
          return next()
        }

        for (const permission of permissions) {
          const hasPermission = await this.roleService.validatePermission(req.user.id, permission)
          if (hasPermission) {
            return next()
          }
        }

        return ResponseHandler.forbidden(res, 'Insufficient permissions')
      } catch (error) {
        return ResponseHandler.forbidden(res, 'Permission validation failed')
      }
    }
  }

  requireAllPermissions(permissions: string[]) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user?.id) {
          return ResponseHandler.forbidden(res, 'Authentication required')
        }
        // Super-admin token bypass
        if (req.user.role === 'super-admin') {
          return next()
        }

        for (const permission of permissions) {
          const hasPermission = await this.roleService.validatePermission(req.user.id, permission)
          if (!hasPermission) {
            return ResponseHandler.forbidden(res, `Permission denied: ${permission}`)
          }
        }

        next()
      } catch (error) {
        return ResponseHandler.forbidden(res, 'Permission validation failed')
      }
    }
  }

  
  requireResourcePermission(options: PermissionOptions) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user?.id) {
          return ResponseHandler.forbidden(res, 'Authentication required')
        }
        // Super-admin token bypass
        if (req.user.role === 'super-admin') {
          return next()
        }

        const { resource, action, scope = 'any', allowSelf = false } = options
        const userId = req.user.id

        // Check if user can access their own resource
        if (allowSelf && this.isSelfAccess(req, userId)) {
          return next()
        }

        // Check resource permission with scope
        const hasPermission = await this.roleService.validateResourceAccess(
          userId, 
          resource, 
          action, 
          scope
        )

        if (!hasPermission) {
          return ResponseHandler.forbidden(res, `Access denied to ${resource}.${action}`)
        }

        next()
      } catch (error) {
        return ResponseHandler.forbidden(res, 'Permission validation failed')
      }
    }
  }


  requireMinimumRole(minimumRole: string) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user?.id) {
          return ResponseHandler.forbidden(res, 'Authentication required')
        }
        // Prefer DB role; fallback to token role if missing
        const userRole = await this.roleService.getActiveRole(req.user.id)
        const tokenRoleName = req.user.role
        const effectiveRoleName = userRole?.roleName || tokenRoleName
        if (!effectiveRoleName) {
          return ResponseHandler.forbidden(res, 'No active role found')
        }

        // Super-admin bypass
        if (effectiveRoleName === 'super-admin') {
          return next()
        }

        const userLevel = this.roleService.getRoleLevel(effectiveRoleName)
        const requiredLevel = this.roleService.getRoleLevel(minimumRole)

        if (userLevel < requiredLevel) {
          return ResponseHandler.forbidden(res, `Minimum role required: ${minimumRole}`)
        }

        next()
      } catch (error) {
        return ResponseHandler.forbidden(res, 'Role validation failed')
      }
    }
  }

  /**
   * Check if user can assign specific role
   */
  requireRoleAssignmentPermission(targetRole?: string) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user?.id) {
          return ResponseHandler.forbidden(res, 'Authentication required')
        }

        // Get target role from request body or params if not provided
        const roleToAssign = targetRole || req.body.roleName || req.params.roleName

        if (!roleToAssign) {
          return ResponseHandler.forbidden(res, 'Target role not specified')
        }

        const canAssign = await this.roleService.canAssignRole(req.user.id, roleToAssign)
        
        if (!canAssign) {
          return ResponseHandler.forbidden(res, `Cannot assign role: ${roleToAssign}`)
        }

        next()
      } catch (error) {
        return ResponseHandler.forbidden(res, 'Role assignment validation failed')
      }
    }
  }

  /**
   * Check if user is accessing their own resource
   */
  private isSelfAccess(req: AuthenticatedRequest, userId: string): boolean {
    // Check various common patterns for self-access
    const targetUserId = req.params.userId || req.params.id || req.body.userId || req.query.userId

    return targetUserId === userId
  }

  /**
   * Utility method to check permissions programmatically
   */
  async checkPermission(userId: string, permission: string): Promise<boolean> {
    try {
      return await this.roleService.validatePermission(userId, permission)
    } catch (error) {
      return false
    }
  }

  /**
   * Utility method to check resource access programmatically
   */
  async checkResourceAccess(
    userId: string, 
    resource: string, 
    action: string, 
    scope: string = 'any'
  ): Promise<boolean> {
    try {
      return await this.roleService.validateResourceAccess(userId, resource, action, scope)
    } catch (error) {
      return false
    }
  }

  /**
   * Get user's active role
   */
  async getUserRole(userId: string) {
    try {
      return await this.roleService.getActiveRole(userId)
    } catch (error) {
      return null
    }
  }
}

// Create singleton instance
export const permissionMiddleware = new PermissionMiddleware()

// Convenience functions for common permissions
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.id) {
    return ResponseHandler.forbidden(res, 'Authentication required')
  }
  next()
}

export const requireEmployee = permissionMiddleware.requireMinimumRole('employee')
export const requireHRStaff = permissionMiddleware.requireMinimumRole('hr-staff')
export const requireManager = permissionMiddleware.requireMinimumRole('manager')
export const requireHRAdmin = permissionMiddleware.requireMinimumRole('hr-admin')
export const requireSuperAdmin = permissionMiddleware.requireMinimumRole('super-admin')

// Common permission checks
export const canReadEmployees = permissionMiddleware.requirePermission('employee.read')
export const canCreateEmployees = permissionMiddleware.requirePermission('employee.create')
export const canUpdateEmployees = permissionMiddleware.requirePermission('employee.update')
export const canDeleteEmployees = permissionMiddleware.requirePermission('employee.delete')

export const canManageRoles = permissionMiddleware.requirePermission('roles.manage')
export const canAssignRoles = permissionMiddleware.requirePermission('roles.assign')

export const canManageRecruitment = permissionMiddleware.requirePermission('recruitment.manage')
export const canManagePayroll = permissionMiddleware.requirePermission('payroll.manage')
export const canGenerateReports = permissionMiddleware.requirePermission('reports.generate')