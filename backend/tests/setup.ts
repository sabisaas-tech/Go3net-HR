import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

process.env.JWT_SECRET = 'test-jwt-secret-key'
process.env.JWT_EXPIRES_IN = '1h'
process.env.JWT_REFRESH_EXPIRES_IN = '7d'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.EMAIL_HOST = 'smtp.test.com'
process.env.EMAIL_PORT = '587'
process.env.EMAIL_USER = 'test@test.com'
process.env.EMAIL_PASS = 'testpass'
process.env.FRONTEND_URL = 'http://localhost:3000'

beforeAll(() => {
  jest.setTimeout(30000)
})

afterAll(() => {
  jest.clearAllTimers()
})