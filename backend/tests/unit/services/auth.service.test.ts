import { AuthService } from '../../../src/services/auth.service'
import { supabase } from '../../../src/config/database'
import { EmailService } from '../../../src/services/email.service'

jest.mock('../../../src/config/database')
jest.mock('../../../src/services/email.service')

const mockEmailService = {
  sendPasswordResetEmail: jest.fn(),
  sendEmailVerificationEmail: jest.fn(),
  sendWelcomeEmail: jest.fn(),
  sendEmail: jest.fn()
}

;(EmailService as jest.MockedClass<typeof EmailService>).mockImplementation(() => mockEmailService as any)

describe('AuthService - Password Reset', () => {
  let authService: AuthService
  let mockSupabase: jest.Mocked<typeof supabase>

  beforeAll(() => {
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    process.env.JWT_SECRET = 'test-jwt-secret'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    authService = new AuthService()
    mockSupabase = supabase as jest.Mocked<typeof supabase>
  })

  describe('forgotPassword', () => {
    const mockUser = {
      id: 'user-123',
      full_name: 'Test User',
      email: 'test@example.com'
    }

    it('should generate reset token and send email for existing user', async () => {
      // Mock the user lookup
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      } as any)

      // Mock the token insert
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      } as any)

      mockEmailService.sendPasswordResetEmail.mockResolvedValue(true)

      const result = await authService.forgotPassword('test@example.com')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Reset link sent to email')
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        expect.any(String)
      )
    })

    it('should return success message even for non-existent user', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found' }
            })
          })
        })
      } as any)

      const result = await authService.forgotPassword('nonexistent@example.com')

      expect(result.success).toBe(true)
      expect(result.message).toBe('If email exists, reset link will be sent')
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      } as any)

      const result = await authService.forgotPassword('test@example.com')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to process password reset')
    })
  })

  describe('resetPassword', () => {
    const mockResetRecord = {
      user_id: 'user-123',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      is_used: false
    }

    it('should reset password with valid token', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockResetRecord,
              error: null
            })
          })
        })
      } as any)

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      } as any)

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      } as any)

      const result = await authService.resetPassword('valid-token', 'NewPassword123')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Password reset successfully')
    })

    it('should reject invalid reset token', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Token not found' }
            })
          })
        })
      } as any)

      const result = await authService.resetPassword('invalid-token', 'NewPassword123')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid or expired reset token')
    })

    it('should reject expired reset token', async () => {
      const expiredRecord = {
        ...mockResetRecord,
        expires_at: new Date(Date.now() - 1000).toISOString()
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: expiredRecord,
              error: null
            })
          })
        })
      } as any)

      const result = await authService.resetPassword('expired-token', 'NewPassword123')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid or expired reset token')
    })

    it('should reject already used reset token', async () => {
      const usedRecord = {
        ...mockResetRecord,
        is_used: true
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: usedRecord,
              error: null
            })
          })
        })
      } as any)

      const result = await authService.resetPassword('used-token', 'NewPassword123')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid or expired reset token')
    })

    it('should handle database update errors', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockResetRecord,
              error: null
            })
          })
        })
      } as any)

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockRejectedValue(new Error('Database error'))
        })
      } as any)

      const result = await authService.resetPassword('valid-token', 'NewPassword123')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to reset password')
    })
  })

  describe('resendEmailVerification', () => {
    const mockUser = {
      id: 'user-123',
      full_name: 'Test User',
      email_verified: false
    }

    it('should resend verification email for unverified user', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      } as any)

      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      } as any)

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      } as any)

      mockEmailService.sendEmailVerificationEmail.mockResolvedValue(true)

      const result = await authService.resendEmailVerification('test@example.com')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Verification email sent')
      expect(mockEmailService.sendEmailVerificationEmail).toHaveBeenCalled()
    })

    it('should reject resend for already verified user', async () => {
      const verifiedUser = {
        ...mockUser,
        email_verified: true
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: verifiedUser,
              error: null
            })
          })
        })
      } as any)

      const result = await authService.resendEmailVerification('test@example.com')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Email already verified')
      expect(mockEmailService.sendEmailVerificationEmail).not.toHaveBeenCalled()
    })

    it('should handle non-existent user', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found' }
            })
          })
        })
      } as any)

      const result = await authService.resendEmailVerification('nonexistent@example.com')

      expect(result.success).toBe(false)
      expect(result.message).toBe('User not found')
    })
  })
})