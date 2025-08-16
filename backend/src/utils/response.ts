import { Response } from 'express'

export interface ApiResponse {
  success: boolean
  message: string
  data?: any
  errors?: string[]
  meta?: any
}

export class ResponseHandler {
  static success(res: Response, message: string, data?: any, statusCode: number = 200): Response {
    const response: ApiResponse = {
      success: true,
      message,
      ...(data && { data })
    }
    return res.status(statusCode).json(response)
  }

  static created(res: Response, message: string, data?: any): Response {
    return ResponseHandler.success(res, message, data, 201)
  }

  static error(res: Response, message: string, statusCode: number = 500, errors?: string[]): Response {
    const response: ApiResponse = {
      success: false,
      message,
      ...(errors && { errors })
    }
    return res.status(statusCode).json(response)
  }

  static badRequest(res: Response, message: string, errors?: string[]): Response {
    return ResponseHandler.error(res, message, 400, errors)
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return ResponseHandler.error(res, message, 401)
  }

  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return ResponseHandler.error(res, message, 403)
  }

  static notFound(res: Response, message: string = 'Resource not found'): Response {
    return ResponseHandler.error(res, message, 404)
  }

  static conflict(res: Response, message: string = 'Resource conflict'): Response {
    return ResponseHandler.error(res, message, 409)
  }

  static validationError(res: Response, errors: string[]): Response {
    return ResponseHandler.badRequest(res, 'Validation error', errors)
  }

  static internalError(res: Response, message: string = 'Internal server error'): Response {
    return ResponseHandler.error(res, message, 500)
  }
}