import { Request, Response, NextFunction } from 'express'
import { verifyToken, TokenPayload } from '../utils/jwt'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
  }
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    })
  }

  try {
    const decoded = verifyToken(token)
    // Normalize to the shape expected across middlewares (id/email/role)
    req.user = {
      id: (decoded as TokenPayload).userId,
      email: (decoded as TokenPayload).email,
      role: (decoded as TokenPayload).role,
    }
    next()
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    })
  }
}

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      })
    }

    next()
  }
}

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    try {
      const decoded = verifyToken(token) as TokenPayload
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      }
    } catch (error) {
      req.user = undefined
    }
  }

  next()
}