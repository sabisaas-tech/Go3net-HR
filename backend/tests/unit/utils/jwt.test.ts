import { generateAccessToken, generateRefreshToken, generateTokens, verifyToken, decodeToken, TokenPayload } from '../../../src/utils/jwt'

// Test suite for JWT (JSON Web Token) utility functions
// These handle authentication tokens for secure API access
describe('JWT Utils', () => {
    // Mock user payload for testing token operations
    // Represents typical user data stored in JWT tokens
    const mockPayload: TokenPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'employee'
    }

    // Set up test environment with JWT configuration
    // These values are used for token signing and verification
    beforeAll(() => {
        process.env.JWT_SECRET = 'test-secret-key'
        process.env.JWT_EXPIRES_IN = '1h'
        process.env.JWT_REFRESH_EXPIRES_IN = '7d'
    })

    // Test access token generation
    // Access tokens are short-lived (1 hour) for API authentication
    describe('generateAccessToken', () => {

        // Verify access token is properly formatted JWT
        // JWT tokens have 3 parts separated by dots: header.payload.signature
        it('should generate a valid access token', () => {
            const token = generateAccessToken(mockPayload)

            // Token should be a string
            expect(typeof token).toBe('string')
            // JWT format: 3 parts separated by dots
            expect(token.split('.')).toHaveLength(3)
        })
    })

    describe('generateRefreshToken', () => {
        it('should generate a valid refresh token', () => {
            const token = generateRefreshToken(mockPayload)

            // Token should be a string
            expect(typeof token).toBe('string')
            // JWT format: 3 parts separated by dots
            expect(token.split('.')).toHaveLength(3)
        })
    })

    // Test token pair generation
    // Returns both access and refresh tokens for complete authentication
    describe('generateTokens', () => {

        // Verify both tokens are generated with metadata
        // Used during login to provide complete token set
        it('should generate both access and refresh tokens', () => {
            const tokens = generateTokens(mockPayload)

            // Should return object with both token types
            expect(tokens).toHaveProperty('accessToken')
            expect(tokens).toHaveProperty('refreshToken')
            expect(tokens).toHaveProperty('expiresIn')
            // Expiration should match environment setting
            expect(tokens.expiresIn).toBe('1h')
        })
    })

    // Test token verification and decoding
    // Critical for validating incoming API requests
    describe('verifyToken', () => {

        // Verify valid tokens are properly decoded
        // Used by authentication middleware to validate requests
        it('should verify a valid token', () => {
            const token = generateAccessToken(mockPayload)
            const decoded = verifyToken(token)

            // Decoded payload should match original data
            expect(decoded.userId).toBe(mockPayload.userId)
            expect(decoded.email).toBe(mockPayload.email)
            expect(decoded.role).toBe(mockPayload.role)
        })

        // Verify invalid tokens are rejected
        // Prevents unauthorized access with malformed tokens
        it('should throw error for invalid token', () => {
            // Test with completely invalid token string
            expect(() => verifyToken('invalid-token')).toThrow('Invalid token')
        })
    })

    // Test token decoding without verification
    // Used for extracting data from tokens without validating signature
    describe('decodeToken', () => {

        // Verify valid tokens can be decoded without verification
        // Useful for extracting user info before full validation
        it('should decode a valid token without verification', () => {
            const token = generateAccessToken(mockPayload)
            const decoded = decodeToken(token)

            // Should extract payload data without signature verification
            expect(decoded?.userId).toBe(mockPayload.userId)
            expect(decoded?.email).toBe(mockPayload.email)
            expect(decoded?.role).toBe(mockPayload.role)
        })

        // Verify invalid tokens return null instead of throwing
        // Graceful handling of malformed tokens
        it('should return null for invalid token', () => {
            const decoded = decodeToken('invalid-token')

            // Invalid token should return null, not throw error
            expect(decoded).toBeNull()
        })
    })
})