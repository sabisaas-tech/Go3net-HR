import { Request, Response, NextFunction } from 'express'
import { AppError, ValidationError } from '../utils/errors'
import { ResponseHandler } from '../utils/response'

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  if (error instanceof ValidationError) {
    return ResponseHandler.validationError(res, error.errors)
  }

  if (error instanceof AppError) {
    return ResponseHandler.error(res, error.message, error.statusCode)
  }

  console.error('Unexpected error:', error)
  return ResponseHandler.internalError(res)
}

export const notFoundHandler = (req: Request, res: Response): Response => {
  return ResponseHandler.notFound(res, `Route ${req.originalUrl} not found`)
}