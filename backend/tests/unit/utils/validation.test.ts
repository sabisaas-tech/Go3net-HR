import Joi from 'joi'

// Common validation schemas used across the application
const emailSchema = Joi.string().email().required()
const passwordSchema = Joi.string().min(8).required()
const employeeIdSchema = Joi.string().pattern(/^EMP-\d{3,}$/).required()

describe('Validation Utilities', () => {
  describe('Email validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'admin+test@go3net.com.ng'
      ]

      validEmails.forEach(email => {
        const { error } = emailSchema.validate(email)
        expect(error).toBeUndefined()
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        ''
      ]

      invalidEmails.forEach(email => {
        const { error } = emailSchema.validate(email)
        expect(error).toBeDefined()
      })
    })
  })

  describe('Password validation', () => {
    it('should validate passwords with minimum length', () => {
      const validPasswords = [
        'password123',
        'StrongP@ssw0rd',
        'MySecurePassword2024!'
      ]

      validPasswords.forEach(password => {
        const { error } = passwordSchema.validate(password)
        expect(error).toBeUndefined()
      })
    })

    it('should reject passwords that are too short', () => {
      const invalidPasswords = [
        'short',
        '1234567',
        '',
        'abc'
      ]

      invalidPasswords.forEach(password => {
        const { error } = passwordSchema.validate(password)
        expect(error).toBeDefined()
        expect(error?.details[0].message).toContain('at least 8 characters')
      })
    })
  })

  describe('Employee ID validation', () => {
    it('should validate correct employee ID formats', () => {
      const validIds = [
        'EMP-001',
        'EMP-123',
        'EMP-999999'
      ]

      validIds.forEach(id => {
        const { error } = employeeIdSchema.validate(id)
        expect(error).toBeUndefined()
      })
    })

    it('should reject invalid employee ID formats', () => {
      const invalidIds = [
        'EMP-12', // Too short
        'EMP-ABC', // Non-numeric
        'EMPLOYEE-123', // Wrong prefix
        '123', // No prefix
        'EMP-', // No number
        ''
      ]

      invalidIds.forEach(id => {
        const { error } = employeeIdSchema.validate(id)
        expect(error).toBeDefined()
      })
    })
  })

  describe('Complex object validation', () => {
    const userSchema = Joi.object({
      email: emailSchema,
      password: passwordSchema,
      fullName: Joi.string().min(2).max(100).required(),
      employeeId: employeeIdSchema,
      departmentId: Joi.string().uuid().optional(),
      hireDate: Joi.date().max('now').required()
    })

    it('should validate complete user objects', () => {
      const validUser = {
        email: 'john.doe@go3net.com.ng',
        password: 'SecurePassword123',
        fullName: 'John Doe',
        employeeId: 'EMP-001',
        hireDate: new Date('2024-01-01')
      }

      const { error } = userSchema.validate(validUser)
      expect(error).toBeUndefined()
    })

    it('should reject incomplete user objects', () => {
      const incompleteUser = {
        email: 'john.doe@go3net.com.ng',
        // Missing required fields
      }

      const { error } = userSchema.validate(incompleteUser)
      expect(error).toBeDefined()
      expect(error?.details.length).toBeGreaterThan(0)
    })

    it('should reject user with future hire date', () => {
      const userWithFutureHireDate = {
        email: 'john.doe@go3net.com.ng',
        password: 'SecurePassword123',
        fullName: 'John Doe',
        employeeId: 'EMP-001',
        hireDate: new Date('2030-01-01') // Future date
      }

      const { error } = userSchema.validate(userWithFutureHireDate)
      expect(error).toBeDefined()
      expect(error?.details[0].message).toContain('must be less than or equal to')
    })
  })
})