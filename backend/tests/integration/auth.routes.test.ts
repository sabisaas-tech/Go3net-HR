import request from 'supertest'
import app from '../../src/server'

describe('Authentication Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        fullName: 'Test User',
        password: 'StrongPass123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('Registration successful')
      expect(response.body.user).toBeDefined()
      expect(response.body.user.email).toBe(userData.email)
    })

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        fullName: 'Test User',
        password: 'StrongPass123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Validation error')
    })

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test2@example.com',
        fullName: 'Test User',
        password: 'weak'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Password does not meet requirements')
      expect(response.body.errors).toBeDefined()
    })

    it('should reject registration with missing fields', async () => {
      const userData = {
        email: 'test3@example.com'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Validation error')
    })
  })

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login-test@example.com',
          fullName: 'Login Test User',
          password: 'LoginPass123'
        })
    })

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'login-test@example.com',
        password: 'LoginPass123'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)

      if (response.body.requiresEmailVerification) {
        expect(response.status).toBe(403)
        expect(response.body.message).toContain('verify your email')
      } else {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.tokens).toBeDefined()
        expect(response.body.user).toBeDefined()
      }
    })

    it('should reject login with invalid credentials', async () => {
      const loginData = {
        email: 'login-test@example.com',
        password: 'WrongPassword123'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Invalid credentials')
    })

    it('should reject login with non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'SomePassword123'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Invalid credentials')
    })

    it('should reject login with invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'SomePassword123'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Validation error')
    })
  })

  describe('POST /api/auth/google', () => {
    it('should handle Google OAuth registration', async () => {
      const googleData = {
        googleToken: 'mock-google-token',
        fullName: 'Google User',
        email: 'google-user@example.com'
      }

      const response = await request(app)
        .post('/api/auth/google')
        .send(googleData)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('Google registration successful')
      expect(response.body.user).toBeDefined()
    })

    it('should handle Google OAuth login for existing user', async () => {
      const googleData = {
        googleToken: 'mock-google-token-2',
        fullName: 'Existing Google User',
        email: 'google-user@example.com'
      }

      const response = await request(app)
        .post('/api/auth/google')
        .send(googleData)

      expect([200, 201]).toContain(response.status)
      expect(response.body.success).toBe(true)
    })

    it('should reject Google OAuth with missing token', async () => {
      const googleData = {
        fullName: 'Google User',
        email: 'google-user2@example.com'
      }

      const response = await request(app)
        .post('/api/auth/google')
        .send(googleData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Validation error')
    })
  })

  describe('POST /api/auth/forgot-password', () => {
    it('should handle forgot password request', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'login-test@example.com' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('Reset link sent')
    })

    it('should handle forgot password for non-existent email gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('should reject forgot password with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Validation error')
    })
  })

  describe('POST /api/auth/reset-password', () => {
    it('should reject password reset with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('should reject password reset with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'some-token',
          newPassword: 'weak'
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Password does not meet requirements')
    })
  })

  describe('GET /api/auth/verify-email/:token', () => {
    it('should reject email verification with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-email/invalid-token')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/auth/resend-verification', () => {
    it('should handle resend verification request', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'login-test@example.com' })

      expect(response.status).toBe(200)
      expect(response.body).toBeDefined()
    })

    it('should reject resend verification with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'invalid-email' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('Valid email is required')
    })
  })
})