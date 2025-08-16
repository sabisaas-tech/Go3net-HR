import { supabase } from '../config/database'
import { hashPassword, comparePassword, generateTemporaryPassword, generateResetToken } from '../utils/password'
import { generateTokens, TokenPayload } from '../utils/jwt'
import { EmailService } from './email.service'
import { RoleService } from './role.service'
import { ConflictError, AuthenticationError, ValidationError, AppError } from '../utils/errors'

export interface RegisterData {
  email: string
  fullName: string
  password: string
  googleId?: string
}

export interface LoginData {
  email: string
  password: string
}

export interface AuthResult {
  user: any
  tokens?: any
  message?: string
  verificationToken?: string
  resetToken?: string
  temporaryPassword?: string
}

export interface User {
  id: string
  email: string
  fullName: string
  employeeId: string
  accountStatus: string
  emailVerified: boolean
  role?: string
}

export class AuthService {
  private emailService: EmailService
  private roleService: RoleService

  constructor() {
    this.emailService = new EmailService()
    this.roleService = new RoleService()
  }

  private async debugDatabaseConstraints() {
    try {
      console.log('🔍 Checking database constraints...')

      // Check users table constraints
      const { data: constraints, error } = await supabase
        .rpc('get_table_constraints', { table_name: 'users' })
        .select()

      if (error) {
        console.log('⚠️ Could not fetch constraints via RPC, trying direct query...')

        // Alternative method to check constraints
        const { data: constraintData, error: constraintError } = await supabase
          .from('information_schema.check_constraints')
          .select('constraint_name, check_clause')
          .like('constraint_name', '%users%')

        if (constraintError) {
          console.log('⚠️ Could not fetch constraint info:', constraintError.message)
        } else {
          console.log('📋 Found constraints:', constraintData)
        }
      } else {
        console.log('📋 Table constraints:', constraints)
      }
    } catch (error) {
      console.log('⚠️ Error checking constraints:', error)
    }
  }

  private async testConstraintValues() {
    try {
      console.log('🧪 Testing constraint values...')

      // Test account_status values
      const testValues = ['pending_setup', 'active', 'suspended']
      for (const value of testValues) {
        console.log(`Testing account_status: '${value}'`)
      }

      // Test status values  
      const statusValues = ['active', 'inactive', 'terminated']
      for (const value of statusValues) {
        console.log(`Testing status: '${value}'`)
      }
    } catch (error) {
      console.log('⚠️ Error testing values:', error)
    }
  }
  async registerWithEmail(data: RegisterData): Promise<AuthResult> {
    const { email, fullName, password } = data



    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      throw new ConflictError('An account with this email already exists. Please try logging in instead.')
    }

    const CEO_EMAIL = process.env.CEO_EMAIL
    if (!CEO_EMAIL) {
      throw new AppError('CEO_EMAIL environment variable is not configured')
    }
    const isCEO = email.toLowerCase() === CEO_EMAIL.toLowerCase()

    const hashedPassword = await hashPassword(password)
    const employeeId = isCEO ? 'CEO001' : `EMP${Date.now()}`

    const userData = {
      email,
      full_name: fullName,
      password_hash: hashedPassword,
      employee_id: employeeId,
      hire_date: new Date().toISOString().split('T')[0],
      account_status: isCEO ? 'active' : 'pending_setup',
      status: isCEO ? 'active' : 'inactive'
    }

    console.log('🔍 Registration Debug Info:')
    console.log('CEO_EMAIL from env:', process.env.CEO_EMAIL)
    console.log('User email:', email)
    console.log('Is CEO:', isCEO)
    console.log('User data being inserted:', {
      ...userData,
      password_hash: '[REDACTED]'
    })

    const { data: newUser, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()

    if (error) {
      console.error('❌ Database insertion error:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })

      // Check if it's a constraint violation
      if (error.code === '23514') {
        console.error('🚨 CHECK CONSTRAINT VIOLATION DETECTED!')
        console.error('This means one of the values does not match the allowed constraint values')
        console.error('User data that failed:', { ...userData, password_hash: '[REDACTED]' })
        console.error('Check account_status and status values in the database schema')

        // Try to identify which constraint failed
        if (error.message.includes('account_status')) {
          console.error('❌ account_status constraint failed. Expected: pending_setup, active, suspended')
          console.error('❌ Actual value:', userData.account_status)
        }
        if (error.message.includes('status')) {
          console.error('❌ status constraint failed. Expected: active, inactive, terminated')
          console.error('❌ Actual value:', userData.status)
        }
      }

      throw new AppError(`Failed to create user account: ${error.message}`)
    }

    console.log('✅ User created successfully:', {
      id: newUser.id,
      email: newUser.email,
      account_status: newUser.account_status,
      status: newUser.status
    })

    // Assign role based on whether this is the CEO or not
    const roleToAssign = isCEO ? 'super-admin' : 'employee'
    const roleResult = await this.roleService.assignRole(newUser.id, roleToAssign, newUser.id)
    if (!roleResult.success) {
      throw new AppError(`Failed to assign ${roleToAssign} role: ${roleResult.message}`)
    }

    // Only send verification email for non-CEO users
    let verificationToken: string | undefined = undefined
    if (!isCEO) {
      verificationToken = generateResetToken()
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const { error: tokenError } = await supabase
        .from('email_verification_tokens')
        .insert({
          user_id: newUser.id,
          verification_token: verificationToken,
          expires_at: expiresAt
        })

      if (tokenError) {
        throw new AppError(`Failed to create verification token: ${tokenError.message}`)
      }

      await this.emailService.sendEmailVerificationEmail(
        newUser.email,
        newUser.full_name,
        verificationToken
      )
    }

    const message = isCEO
      ? 'CEO account created successfully! You can now log in immediately.'
      : 'Account created successfully! Please check your email and click the verification link to activate your account.'

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        employeeId: newUser.employee_id,
        accountStatus: newUser.account_status,
        role: roleToAssign
      },
      message,
      verificationToken
    }
  }

  async loginWithEmail(data: LoginData): Promise<AuthResult> {
    const { email, password } = data

    // First get the user
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, email, full_name, password_hash, employee_id, account_status, status
      `)
      .eq('email', email)
      .single()

    if (error || !user) {
      throw new AuthenticationError('Invalid email or password')
    }

    const isValidPassword = await comparePassword(password, user.password_hash)
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email or password')
    }

    // Check if account is suspended
    if (user.account_status === 'suspended') {
      throw new AuthenticationError('Account has been suspended. Please contact support.')
    }

    // Check if user is terminated
    if (user.status === 'terminated') {
      throw new AuthenticationError('Account has been terminated. Please contact support.')
    }

    // Get user roles separately
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_name, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)

    let activeRole = null
    if (userRoles && userRoles.length > 0) {
      activeRole = userRoles[0] // Take the first active role
    }
    
    if (!activeRole) {
      // Assign default employee role if none exists
      const roleResult = await this.roleService.assignRole(user.id, 'employee', user.id)
      if (roleResult.success) {
        activeRole = { role_name: 'employee', is_active: true }
      } else {
        throw new AuthenticationError('Unable to assign user role. Please contact support.')
      }
    }

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: activeRole.role_name
    }

    const tokens = generateTokens(tokenPayload)

    const userPayload = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      employeeId: user.employee_id,
      accountStatus: user.account_status,
      role: activeRole.role_name
    }

    console.log('[AuthService] loginWithEmail - Returning user payload:', userPayload)

    return {
      user: userPayload,
      tokens
    }
  }

  async createEmployeeAccount(employeeData: any, createdBy: string): Promise<AuthResult> {
    const temporaryPassword = generateTemporaryPassword()
    const hashedPassword = await hashPassword(temporaryPassword)
    const employeeId = `EMP${Date.now()}`

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        ...employeeData,
        password_hash: hashedPassword,
        employee_id: employeeId,
        is_temporary_password: true,
        account_status: 'pending_setup',
        created_by: createdBy,
        invitation_sent_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new AppError(`Failed to create employee account: ${error.message}`)
    }

    const roleResult = await this.roleService.assignRole(newUser.id, 'employee', createdBy)
    if (!roleResult.success) {
      throw new AppError(`Failed to assign employee role: ${roleResult.message}`)
    }

    return {
      user: newUser,
      temporaryPassword
    }
  }

  async forgotPassword(email: string, ipAddress?: string): Promise<void> {
    // Check rate limiting - 5 attempts per 24 hours per email
    await this.checkPasswordResetRateLimit(email, ipAddress)

    const { data: user } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('email', email)
      .single()

    // Log the attempt regardless of whether user exists (security)
    await this.logPasswordResetAttempt(email, ipAddress, !!user)

    if (!user) {
      // Don't reveal if user exists or not
      return
    }

    const resetToken = generateResetToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        reset_token: resetToken,
        expires_at: expiresAt,
        ip_address: ipAddress
      })

    if (error) {
      throw new AppError(`Failed to create reset token: ${error.message}`)
    }

    await this.emailService.sendPasswordResetEmail(
      email,
      user.full_name,
      resetToken
    )
  }

  private async checkPasswordResetRateLimit(email: string, ipAddress?: string): Promise<void> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Check email-based rate limiting
    const { data: emailAttempts, error: emailError } = await supabase
      .from('password_reset_attempts')
      .select('id')
      .eq('email', email)
      .gte('attempted_at', twentyFourHoursAgo)

    if (emailError) {
      throw new AppError(`Failed to check rate limit: ${emailError.message}`)
    }

    if (emailAttempts && emailAttempts.length >= 5) {
      throw new ValidationError(
        'Too many password reset attempts. Please try again in 24 hours.',
        ['Rate limit exceeded for this email address']
      )
    }

    // Check IP-based rate limiting (if IP is provided)
    if (ipAddress) {
      const { data: ipAttempts, error: ipError } = await supabase
        .from('password_reset_attempts')
        .select('id')
        .eq('ip_address', ipAddress)
        .gte('attempted_at', twentyFourHoursAgo)

      if (ipError) {
        throw new AppError(`Failed to check IP rate limit: ${ipError.message}`)
      }

      if (ipAttempts && ipAttempts.length >= 10) {
        throw new ValidationError(
          'Too many password reset attempts from this location. Please try again in 24 hours.',
          ['Rate limit exceeded for this IP address']
        )
      }
    }
  }

  private async logPasswordResetAttempt(email: string, ipAddress?: string, success: boolean = false): Promise<void> {
    const { error } = await supabase
      .from('password_reset_attempts')
      .insert({
        email,
        ip_address: ipAddress,
        success,
        attempted_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to log password reset attempt:', error)
      // Don't throw error here as it shouldn't block the main flow
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const { data: resetRecord, error } = await supabase
      .from('password_reset_tokens')
      .select('user_id, expires_at, is_used')
      .eq('reset_token', token)
      .single()

    if (error || !resetRecord || resetRecord.is_used || new Date(resetRecord.expires_at) < new Date()) {
      throw new ValidationError('Invalid or expired reset token')
    }

    const hashedPassword = await hashPassword(newPassword)

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        is_temporary_password: false,
        last_password_change: new Date().toISOString()
      })
      .eq('id', resetRecord.user_id)

    if (updateError) {
      throw new AppError(`Failed to update password: ${updateError.message}`)
    }

    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .update({ is_used: true })
      .eq('reset_token', token)

    if (tokenError) {
      throw new AppError(`Failed to mark token as used: ${tokenError.message}`)
    }
  }

  async resendEmailVerification(email: string): Promise<void> {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('email', email)
      .single()

    if (error || !user) {
      throw new ValidationError('User not found')
    }

    // Skip email verification check for now
    // if (user.email_verified) {
    //   throw new ValidationError('Email already verified')
    // }

    // Mark existing tokens as used
    await supabase
      .from('email_verification_tokens')
      .update({ is_used: true })
      .eq('user_id', user.id)
      .eq('is_used', false)

    const verificationToken = generateResetToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { error: tokenError } = await supabase
      .from('email_verification_tokens')
      .insert({
        user_id: user.id,
        verification_token: verificationToken,
        expires_at: expiresAt
      })

    if (tokenError) {
      throw new AppError(`Failed to create verification token: ${tokenError.message}`)
    }

    await this.emailService.sendEmailVerificationEmail(
      email,
      user.full_name,
      verificationToken
    )
  }

  async verifyEmail(token: string): Promise<void> {
    const response = await fetch('https://cwxlqpjslegqisijixwu.supabase.co/functions/v1/email-service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        action: 'verify_email',
        token
      })
    })

    const result = await response.json() as { success: boolean; message?: string }

    if (!result.success) {
      throw new ValidationError(result.message || 'Email verification failed')
    }
  }
}