import { Router, Request, Response } from 'express'
import { supabase } from '../config/database'
import { comparePassword } from '../utils/password'

const router = Router()

// Debug endpoint to check user data and password
router.post('/check-user', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    console.log('🔍 Debug check for email:', email)

    // Get user data
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, email, full_name, password_hash, employee_id, account_status, status,
        user_roles(role_name, is_active)
      `)
      .eq('email', email)
      .single()

    if (error) {
      console.log('❌ Database error:', error)
      return res.json({
        found: false,
        error: error.message,
        details: error
      })
    }

    if (!user) {
      return res.json({
        found: false,
        message: 'User not found'
      })
    }

    // Test password
    const passwordMatch = await comparePassword(password, user.password_hash)

    return res.json({
      found: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        employee_id: user.employee_id,
        account_status: user.account_status,
        status: user.status,
        roles: user.user_roles
      },
      passwordMatch,
      passwordHashPrefix: user.password_hash.substring(0, 20) + '...'
    })

  } catch (error: any) {
    console.error('Debug endpoint error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router