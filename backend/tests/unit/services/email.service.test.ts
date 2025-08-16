import { EmailService } from '../../../src/services/email.service'
import nodemailer from 'nodemailer'

jest.mock('nodemailer')

describe('EmailService', () => {
  let emailService: EmailService
  let mockTransporter: jest.Mocked<nodemailer.Transporter>

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn()
    } as any

      ; (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter)

    process.env.EMAIL_HOST = 'smtp.test.com'
    process.env.EMAIL_PORT = '587'
    process.env.EMAIL_USER = 'test@test.com'
    process.env.EMAIL_PASS = 'testpass'
    process.env.FRONTEND_URL = 'http://localhost:3000'

    emailService = new EmailService()
    jest.clearAllMocks()
  })

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' })

      const emailData = {
        to: 'recipient@test.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      }

      const result = await emailService.sendEmail(emailData)

      expect(result).toBe(true)
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"Go3net HR System" <test@test.com>',
        to: 'recipient@test.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      })
    })

    it('should handle email sending failure', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'))

      const emailData = {
        to: 'recipient@test.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      }

      const result = await emailService.sendEmail(emailData)

      expect(result).toBe(false)
    })
  })

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct content', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' })

      const result = await emailService.sendPasswordResetEmail(
        'user@test.com',
        'Test User',
        'reset-token-123'
      )

      expect(result).toBe(true)
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Reset Your Password - Go3net HR Management System',
          html: expect.stringMatching(/Password Reset Request.*Test User.*http:\/\/localhost:3000\/reset-password\?token=reset-token-123/s)
        })
      )
    })

    it('should handle password reset email failure', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('Email failed'))

      const result = await emailService.sendPasswordResetEmail(
        'user@test.com',
        'Test User',
        'reset-token-123'
      )

      expect(result).toBe(false)
    })
  })

  describe('sendEmailVerificationEmail', () => {
    it('should send email verification email with correct content', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' })

      const result = await emailService.sendEmailVerificationEmail(
        'user@test.com',
        'Test User',
        'verify-token-123'
      )

      expect(result).toBe(true)
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Verify Your Email - Go3net HR Management System',
          html: expect.stringMatching(/Verify Your Email.*Test User.*http:\/\/localhost:3000\/verify-email\?token=verify-token-123/s)
        })
      )
    })

    it('should handle email verification email failure', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('Email failed'))

      const result = await emailService.sendEmailVerificationEmail(
        'user@test.com',
        'Test User',
        'verify-token-123'
      )

      expect(result).toBe(false)
    })
  })

  describe('sendEmployeeInvitationEmail', () => {
    it('should send employee invitation email with correct content', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' })

      const result = await emailService.sendEmployeeInvitationEmail(
        'employee@test.com',
        'New Employee',
        'temp-password-123'
      )

      expect(result).toBe(true)
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'employee@test.com',
          subject: 'Welcome to Go3net HR Management System',
          html: expect.stringMatching(/Welcome to the Team!.*New Employee.*employee@test\.com.*temp-password-123.*http:\/\/localhost:3000\/login/s)
        })
      )
    })

    it('should handle employee invitation email failure', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('Email failed'))

      const result = await emailService.sendEmployeeInvitationEmail(
        'employee@test.com',
        'New Employee',
        'temp-password-123'
      )

      expect(result).toBe(false)
    })
  })

  describe('constructor', () => {
    it('should create transporter with correct configuration', () => {
      new EmailService()

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@test.com',
          pass: 'testpass'
        }
      })
    })

    it('should use default port if not provided', () => {
      delete process.env.EMAIL_PORT

      new EmailService()

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 587
        })
      )
    })
  })
})