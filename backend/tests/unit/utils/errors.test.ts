import { AppError } from '../../../src/utils/errors'

describe('AppError', () => {
  describe('constructor', () => {
    it('should create an AppError with message and status code', () => {
      const error = new AppError('Test error message', 400)

      expect(error.message).toBe('Test error message')
      expect(error.statusCode).toBe(400)
      expect(error.name).toBe('AppError')
      expect(error.isOperational).toBe(true)
    })

    it('should default to status code 500 when not provided', () => {
      const error = new AppError('Internal error')

      expect(error.message).toBe('Internal error')
      expect(error.statusCode).toBe(500)
      expect(error.isOperational).toBe(true)
    })

    it('should set isOperational to false when specified', () => {
      const error = new AppError('Programming error', 500, false)

      expect(error.isOperational).toBe(false)
    })

    it('should maintain proper error stack trace', () => {
      const error = new AppError('Stack trace test', 400)

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('AppError')
      expect(error.stack).toContain('Stack trace test')
    })
  })

  describe('inheritance', () => {
    it('should be an instance of Error', () => {
      const error = new AppError('Test', 400)

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AppError)
    })

    it('should work with instanceof checks', () => {
      const error = new AppError('Test', 400)

      expect(error instanceof Error).toBe(true)
      expect(error instanceof AppError).toBe(true)
    })
  })

  describe('error properties', () => {
    it('should have correct properties for client errors', () => {
      const error = new AppError('Bad Request', 400)

      expect(error.message).toBe('Bad Request')
      expect(error.statusCode).toBe(400)
      expect(error.isOperational).toBe(true)
    })

    it('should have correct properties for server errors', () => {
      const error = new AppError('Internal Server Error', 500)

      expect(error.message).toBe('Internal Server Error')
      expect(error.statusCode).toBe(500)
      expect(error.isOperational).toBe(true)
    })

    it('should handle authentication errors', () => {
      const error = new AppError('Unauthorized', 401)

      expect(error.message).toBe('Unauthorized')
      expect(error.statusCode).toBe(401)
      expect(error.isOperational).toBe(true)
    })

    it('should handle authorization errors', () => {
      const error = new AppError('Forbidden', 403)

      expect(error.message).toBe('Forbidden')
      expect(error.statusCode).toBe(403)
      expect(error.isOperational).toBe(true)
    })

    it('should handle not found errors', () => {
      const error = new AppError('Not Found', 404)

      expect(error.message).toBe('Not Found')
      expect(error.statusCode).toBe(404)
      expect(error.isOperational).toBe(true)
    })

    it('should handle validation errors', () => {
      const error = new AppError('Validation failed', 422)

      expect(error.message).toBe('Validation failed')
      expect(error.statusCode).toBe(422)
      expect(error.isOperational).toBe(true)
    })
  })

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const error = new AppError('Test error', 400)
      const serialized = JSON.stringify(error)
      const parsed = JSON.parse(serialized)

      expect(parsed.message).toBe('Test error')
      expect(parsed.name).toBe('AppError')
      // Note: statusCode and isOperational might not be enumerable
    })

    it('should work with Object.assign', () => {
      const error = new AppError('Test error', 400)
      const copied = Object.assign({}, error)

      expect(copied.message).toBe('Test error')
      expect(copied.name).toBe('AppError')
    })
  })

  describe('error throwing and catching', () => {
    it('should be throwable and catchable', () => {
      expect(() => {
        throw new AppError('Test throw', 400)
      }).toThrow('Test throw')
    })

    it('should be catchable as AppError', () => {
      try {
        throw new AppError('Test catch', 400)
      } catch (error) {
        expect(error).toBeInstanceOf(AppError)
        expect((error as AppError).statusCode).toBe(400)
        expect((error as AppError).isOperational).toBe(true)
      }
    })

    it('should be catchable as generic Error', () => {
      try {
        throw new AppError('Test generic catch', 500)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Test generic catch')
      }
    })
  })

  describe('common error scenarios', () => {
    it('should handle user not found errors', () => {
      const error = new AppError('User not found', 404)

      expect(error.message).toBe('User not found')
      expect(error.statusCode).toBe(404)
      expect(error.isOperational).toBe(true)
    })

    it('should handle invalid credentials errors', () => {
      const error = new AppError('Invalid credentials', 401)

      expect(error.message).toBe('Invalid credentials')
      expect(error.statusCode).toBe(401)
      expect(error.isOperational).toBe(true)
    })

    it('should handle insufficient permissions errors', () => {
      const error = new AppError('Insufficient permissions', 403)

      expect(error.message).toBe('Insufficient permissions')
      expect(error.statusCode).toBe(403)
      expect(error.isOperational).toBe(true)
    })

    it('should handle resource conflict errors', () => {
      const error = new AppError('Resource already exists', 409)

      expect(error.message).toBe('Resource already exists')
      expect(error.statusCode).toBe(409)
      expect(error.isOperational).toBe(true)
    })

    it('should handle rate limiting errors', () => {
      const error = new AppError('Too many requests', 429)

      expect(error.message).toBe('Too many requests')
      expect(error.statusCode).toBe(429)
      expect(error.isOperational).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty message', () => {
      const error = new AppError('', 400)

      expect(error.message).toBe('')
      expect(error.statusCode).toBe(400)
    })

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000)
      const error = new AppError(longMessage, 400)

      expect(error.message).toBe(longMessage)
      expect(error.message.length).toBe(1000)
    })

    it('should handle special characters in message', () => {
      const specialMessage = 'Error with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?'
      const error = new AppError(specialMessage, 400)

      expect(error.message).toBe(specialMessage)
    })

    it('should handle unicode characters in message', () => {
      const unicodeMessage = 'Error with unicode: 你好 🚀 ñáéíóú'
      const error = new AppError(unicodeMessage, 400)

      expect(error.message).toBe(unicodeMessage)
    })
  })

  describe('comparison with standard Error', () => {
    it('should have additional properties compared to standard Error', () => {
      const standardError = new Error('Standard error')
      const appError = new AppError('App error', 400)

      expect(standardError).not.toHaveProperty('statusCode')
      expect(standardError).not.toHaveProperty('isOperational')
      
      expect(appError).toHaveProperty('statusCode')
      expect(appError).toHaveProperty('isOperational')
    })

    it('should maintain Error behavior', () => {
      const appError = new AppError('Test error', 400)

      expect(appError.toString()).toContain('AppError: Test error')
      expect(appError.name).toBe('AppError')
      expect(appError.message).toBe('Test error')
    })
  })
})