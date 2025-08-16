import { Router } from 'express'
import { 
  register, 
  login, 
  googleAuth, 
  forgotPassword, 
  resetPassword, 
  verifyEmail, 
  resendVerification,
  me
} from '../controllers/auth.controller'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', authenticateToken, me)
router.post('/google', googleAuth)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.get('/verify-email/:token', verifyEmail)
router.post('/resend-verification', resendVerification)

export default router