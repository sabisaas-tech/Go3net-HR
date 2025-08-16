import { Request, Response, NextFunction } from 'express'
import { RoleService } from '../services/role.service'
import { ResponseHandler } from '../utils/response'
import { ValidationError, AuthorizationError } from '../utils/errors'
import { AuthenticatedRequest } from '../middleware/auth'
import Joi from 'joi'

const roleService = new RoleService()

const assignRoleSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  roleName: Joi.string().valid(...roleService.getAvailableRoles()).required()
})

const updatePermissionsSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  permissions: Joi.array().items(Joi.string()).required()
})

export const assignRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AuthorizationError('Authentication required')
    }

    const { error, value } = assignRoleSchema.validate(req.body)
    if (error) {
      const errors = error.details.map(detail => detail.message)
      throw new ValidationError('Validation error', errors)
    }

    const { userId, roleName } = value
    const result = await roleService.assignRole(userId, roleName, req.user.id)

    if (!result.success) {
      throw new AuthorizationError(result.message)
    }

    return ResponseHandler.success(res, result.message, { role: result.role })
  } catch (error) {
    next(error)
  }
}

export const getUserRoles = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AuthorizationError('Authentication required')
    }

    const { userId } = req.params

    if (!userId) {
      throw new ValidationError('User ID is required')
    }

    const roles = await roleService.getUserRoles(userId)

    return ResponseHandler.success(res, 'User roles retrieved successfully', { roles })
  } catch (error) {
    next(error)
  }
}

export const getMyRoles = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AuthorizationError('Authentication required')
    }

    const roles = await roleService.getUserRoles(req.user.id)

    return ResponseHandler.success(res, 'Your roles retrieved successfully', { roles })
  } catch (error) {
    next(error)
  }
}

export const updateUserPermissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AuthorizationError('Authentication required')
    }

    const { error, value } = updatePermissionsSchema.validate(req.body)
    if (error) {
      const errors = error.details.map(detail => detail.message)
      throw new ValidationError('Validation error', errors)
    }

    const { userId, permissions } = value
    const result = await roleService.updateUserPermissions(userId, permissions, req.user.id)

    if (!result.success) {
      throw new AuthorizationError(result.message)
    }

    return ResponseHandler.success(res, result.message, { role: result.role })
  } catch (error) {
    next(error)
  }
}

export const deactivateUserRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AuthorizationError('Authentication required')
    }

    const { userId } = req.params

    if (!userId) {
      throw new ValidationError('User ID is required')
    }

    const result = await roleService.deactivateRole(userId, req.user.id)

    if (!result.success) {
      throw new AuthorizationError(result.message)
    }

    return ResponseHandler.success(res, result.message)
  } catch (error) {
    next(error)
  }
}

export const getRoleHierarchy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hierarchy = roleService.getRoleHierarchy()

    return ResponseHandler.success(res, 'Role hierarchy retrieved successfully', { hierarchy })
  } catch (error) {
    next(error)
  }
}

export const getAvailableRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = roleService.getAvailableRoles()

    return ResponseHandler.success(res, 'Available roles retrieved successfully', { roles })
  } catch (error) {
    next(error)
  }
}

export const validatePermission = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AuthorizationError('Authentication required')
    }

    const { permission } = req.params

    if (!permission) {
      throw new ValidationError('Permission is required')
    }

    const hasPermission = await roleService.validatePermission(req.user.id, permission)

    return ResponseHandler.success(res, 'Permission validation completed', {
      hasPermission,
      permission
    })
  } catch (error) {
    next(error)
  }
}