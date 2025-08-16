import { Request, Response, NextFunction } from 'express'
import { AuthService } from '../services/auth.service'
import { supabase } from '../config/database'
import { AuthenticatedRequest } from '../middleware/auth'
import { validatePasswordStrength } from '../utils/password'
import { ResponseHandler } from '../utils/response'
import { ValidationError } from '../utils/errors'
import Joi from 'joi'

const authService = new AuthService()

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  fullName: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(8).required()
})

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
})

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
})

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
})

const googleAuthSchema = Joi.object({
  googleToken: Joi.string().required(),
  fullName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required()
})

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = registerSchema.validate(req.body)
    if (error) {
      const errors = error.details.map(detail => detail.message)
      throw new ValidationError('Validation failed', errors)
    }

    const { email, fullName, password } = value

    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password does not meet requirements', passwordValidation.errors)
    }

    const result = await authService.registerWithEmail({
      email,
      fullName,
      password
    })

    return ResponseHandler.created(res, result.message || 'Account created successfully!', {
      user: result.user
    })
  } catch (error: any) {
    console.error('❌ Registration error in controller:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      timestamp: new Date().toISOString()
    })
    next(error)
  }
}

// Get current authenticated user
export const me = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, 'Authentication required')
    }

    const { id: userId, role } = req.user

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, employee_id, account_status, status')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return ResponseHandler.notFound(res, 'User not found')
    }

    return ResponseHandler.success(res, 'Current user', {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        employeeId: user.employee_id,
        accountStatus: user.account_status,
        role: role
      }
    })
  } catch (error) {
    next(error)
  }
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = loginSchema.validate(req.body)
    if (error) {
      const errors = error.details.map(detail => detail.message)
      throw new ValidationError('Validation error', errors)
    }

    const { email, password } = value

    const result = await authService.loginWithEmail({ email, password })

    return ResponseHandler.success(res, 'Login successful', {
      user: result.user,
      tokens: result.tokens
    })
  } catch (error) {
    next(error)
  }
}

export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = googleAuthSchema.validate(req.body)
    if (error) {
      const errors = error.details.map(detail => detail.message)
      throw new ValidationError('Validation error', errors)
    }

    const { googleToken, fullName, email } = value

    try {
      const result = await authService.registerWithEmail({
        email,
        fullName,
        password: 'google-oauth-user',
        googleId: googleToken
      })

      return ResponseHandler.created(res, 'Google registration successful', {
        user: result.user
      })
    } catch (error: any) {
      // If registration fails (user exists), try login
      if (error.statusCode === 409) {
        const loginResult = await authService.loginWithEmail({
          email,
          password: 'google-oauth-user'
        })

        return ResponseHandler.success(res, 'Google login successful', {
          user: loginResult.user,
          tokens: loginResult.tokens
        })
      }
      throw error
    }
  } catch (error) {
    next(error)
  }
}

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body)
    if (error) {
      const errors = error.details.map(detail => detail.message)
      throw new ValidationError('Validation error', errors)
    }

    const { email } = value
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string

    await authService.forgotPassword(email, ipAddress)

    return ResponseHandler.success(res, 'If email exists, reset link will be sent')
  } catch (error) {
    next(error)
  }
}

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body)
    if (error) {
      const errors = error.details.map(detail => detail.message)
      throw new ValidationError('Validation error', errors)
    }

    const { token, newPassword } = value

    const passwordValidation = validatePasswordStrength(newPassword)
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password does not meet requirements', passwordValidation.errors)
    }

    await authService.resetPassword(token, newPassword)

    return ResponseHandler.success(res, 'Password reset successful')
  } catch (error) {
    next(error)
  }
}

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params

    if (!token) {
      throw new ValidationError('Verification token is required')
    }

    await authService.verifyEmail(token)

    return ResponseHandler.success(res, 'Email verified successfully')
  } catch (error) {
    next(error)
  }
}

export const resendVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = Joi.object({
      email: Joi.string().email().required()
    }).validate(req.body)

    if (error) {
      throw new ValidationError('Valid email is required')
    }

    const { email } = value
    await authService.resendEmailVerification(email)

    return ResponseHandler.success(res, 'Verification email sent')
  } catch (error) {
    next(error)
  }
}