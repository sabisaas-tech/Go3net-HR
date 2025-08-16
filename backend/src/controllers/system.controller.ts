import { Request, Response, NextFunction } from 'express'
import { SystemService } from '../services/system.service'
import { ResponseHandler } from '../utils/response'
import { ValidationError } from '../utils/errors'
import Joi from 'joi'

const systemService = new SystemService()

const createHRAdminSchema = Joi.object({
  email: Joi.string().email().required(),
  fullName: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(8).required()
})

export const initializeSystem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await systemService.initializeSystem()

    return ResponseHandler.created(res, 'System initialized successfully with super admin account', {
      superAdminCreated: result.superAdminCreated,
      credentials: result.superAdminCredentials
    })
  } catch (error) {
    next(error)
  }
}

export const getSystemStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await systemService.getSystemStatus()

    return ResponseHandler.success(res, 'System status retrieved', status)
  } catch (error) {
    next(error)
  }
}

export const createFirstHRAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createHRAdminSchema.validate(req.body)
    if (error) {
      const errors = error.details.map(detail => detail.message)
      throw new ValidationError('Validation error', errors)
    }

    // This endpoint should be protected and only accessible by super admin
    const userId = (req as any).user?.id
    if (!userId) {
      throw new ValidationError('Authentication required')
    }

    await systemService.createFirstHRAdmin(value, userId)

    return ResponseHandler.created(res, 'HR Admin account created successfully')
  } catch (error) {
    next(error)
  }
}