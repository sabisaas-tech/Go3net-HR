import { hashPassword, comparePassword, generateTemporaryPassword, generateResetToken, validatePasswordStrength } from '../../../src/utils/password'

// Test suite for password utility functions
// These functions handle all password-related security operations in the HR system
describe('Password Utils', () => {
    
    // Test password hashing functionality using bcrypt
    // Critical for storing passwords securely in database - prevents plain text storage
    describe('hashPassword', () => {
        
        // Verify that passwords are properly hashed and not stored as plain text
        // This prevents password exposure if database is compromised
        it('should hash a password', async () => {
            const password = 'testPassword123'
            const hashed = await hashPassword(password)
            
            // Ensure password is transformed (not plain text)
            expect(hashed).not.toBe(password)
            // Bcrypt hashes are typically 60+ characters long with salt
            expect(hashed.length).toBeGreaterThan(50)
        })

        // Verify that bcrypt salt ensures different hashes for same password
        // This prevents rainbow table attacks and adds security layer
        it('should generate different hashes for same password', async () => {
            const password = 'testPassword123'
            const hash1 = await hashPassword(password)
            const hash2 = await hashPassword(password)
            
            // Same password should produce different hashes due to random salt
            expect(hash1).not.toBe(hash2)
        })
    })

    // Test password verification against stored hashes
    // Used during login to verify user credentials
    describe('comparePassword', () => {
        
        // Verify that correct password matches its hash
        // Essential for successful user authentication
        it('should return true for correct password', async () => {
            const password = 'testPassword123'
            const hashed = await hashPassword(password)
            const isValid = await comparePassword(password, hashed)
            
            // Correct password should validate against its hash
            expect(isValid).toBe(true)
        })

        // Verify that incorrect password fails validation
        // Prevents unauthorized access with wrong credentials
        it('should return false for incorrect password', async () => {
            const password = 'testPassword123'
            const wrongPassword = 'wrongPassword123'
            const hashed = await hashPassword(password)
            const isValid = await comparePassword(wrongPassword, hashed)
            
            // Wrong password should not validate against hash
            expect(isValid).toBe(false)
        })
    })

    // Test temporary password generation for new employee accounts
    // Used when HR admin creates employee accounts - they get temp password via email
    describe('generateTemporaryPassword', () => {
        
        // Verify temp password meets length requirements
        // 12 characters provides good security while being manageable
        it('should generate a 12 character password', () => {
            const password = generateTemporaryPassword()
            
            // Temp passwords should be exactly 12 characters
            expect(password.length).toBe(12)
        })

        // Verify each temp password is unique
        // Prevents predictable passwords that could be guessed
        it('should generate different passwords each time', () => {
            const password1 = generateTemporaryPassword()
            const password2 = generateTemporaryPassword()
            
            // Each generated password should be unique
            expect(password1).not.toBe(password2)
        })

        // Verify temp passwords only use safe characters
        // Excludes confusing characters like 0/O, I/l to prevent user errors
        it('should only contain allowed characters', () => {
            const password = generateTemporaryPassword()
            // Character set excludes confusing chars: 0, O, I, l, 1
            const allowedChars = /^[ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789]+$/
            
            // Password should only contain safe, unambiguous characters
            expect(allowedChars.test(password)).toBe(true)
        })
    })

    // Test password reset token generation
    // Used for forgot password functionality - tokens sent via email
    describe('generateResetToken', () => {
        
        // Verify reset tokens are proper length
        // 64 hex characters provide sufficient entropy for security
        it('should generate a 64 character hex token', () => {
            const token = generateResetToken()
            
            // Reset tokens should be exactly 64 characters
            expect(token.length).toBe(64)
            // Should only contain hex characters (0-9, a-f)
            expect(/^[a-f0-9]+$/.test(token)).toBe(true)
        })

        // Verify each reset token is unique
        // Prevents token collision and ensures security
        it('should generate different tokens each time', () => {
            const token1 = generateResetToken()
            const token2 = generateResetToken()
            
            // Each token should be cryptographically unique
            expect(token1).not.toBe(token2)
        })
    })

    // Test password strength validation rules
    // Enforces security policy for user-chosen passwords
    describe('validatePasswordStrength', () => {
        
        // Verify strong passwords pass validation
        // Tests the happy path with compliant password
        it('should validate a strong password', () => {
            const result = validatePasswordStrength('StrongPass123')
            
            // Strong password should pass all validation rules
            expect(result.isValid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })

        // Test minimum length requirement (8 characters)
        // Prevents weak passwords that are easy to crack
        it('should reject password too short', () => {
            const result = validatePasswordStrength('Short1')
            
            // Short password should fail validation
            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Password must be at least 8 characters long')
        })

        // Test uppercase letter requirement
        // Increases password complexity and security
        it('should reject password without uppercase', () => {
            const result = validatePasswordStrength('lowercase123')
            
            // Password without uppercase should fail
            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Password must contain at least one uppercase letter')
        })

        // Test lowercase letter requirement
        // Ensures mixed case for better security
        it('should reject password without lowercase', () => {
            const result = validatePasswordStrength('UPPERCASE123')
            
            // Password without lowercase should fail
            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Password must contain at least one lowercase letter')
        })

        // Test numeric character requirement
        // Numbers add complexity and meet common security policies
        it('should reject password without numbers', () => {
            const result = validatePasswordStrength('NoNumbers')
            
            // Password without numbers should fail
            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Password must contain at least one number')
        })

        // Test multiple validation errors
        // Ensures all rules are checked and reported
        it('should return multiple errors for weak password', () => {
            const result = validatePasswordStrength('weak')
            
            // Very weak password should have multiple errors
            expect(result.isValid).toBe(false)
            expect(result.errors.length).toBeGreaterThan(1)
        })
    })
})