import { Request, Response, NextFunction } from 'express'
import { authenticateToken, requireRole, optionalAuth, AuthenticatedRequest } from '../../../src/middleware/auth'
import { generateAccessToken, TokenPayload } from '../../../src/utils/jwt'

// Test suite for authentication middleware functions
// These middleware functions protect API routes and enforce access control
describe('Auth Middleware', () => {
    // Mock Express request, response, and next function
    // These simulate the Express.js middleware environment
    let mockRequest: Partial<AuthenticatedRequest>
    let mockResponse: Partial<Response>
    let mockNext: NextFunction

    // Mock user payload for testing authentication
    // Represents a typical employee user in the system
    const mockPayload: TokenPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'employee'
    }

    // Set up JWT secret for token generation in tests
    beforeAll(() => {
        process.env.JWT_SECRET = 'test-secret-key'
    })

    // Reset mock objects before each test
    // Ensures clean state for each test case
    beforeEach(() => {
        mockRequest = {
            headers: {}
        }
        // Mock response methods that return 'this' for chaining
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        }
        mockNext = jest.fn()
    })

    // Test token authentication middleware
    // This middleware validates JWT tokens on protected routes
    describe('authenticateToken', () => {
        
        // Test successful authentication with valid Bearer token
        // This is the happy path for authenticated API requests
        it('should authenticate valid token', () => {
            const token = generateAccessToken(mockPayload)
            mockRequest.headers = {
                authorization: `Bearer ${token}`
            }

            authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

            // Should set user data on request object
            expect(mockRequest.user).toBeDefined()
            expect(mockRequest.user?.userId).toBe(mockPayload.userId)
            // Should call next() to continue to route handler
            expect(mockNext).toHaveBeenCalled()
        })

        // Test rejection when no token is provided
        // Protects routes from unauthenticated access
        it('should reject request without token', () => {
            authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

            // Should return 401 Unauthorized
            expect(mockResponse.status).toHaveBeenCalledWith(401)
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Access token required'
            })
            // Should NOT call next() - request is blocked
            expect(mockNext).not.toHaveBeenCalled()
        })

        // Test rejection of invalid/malformed tokens
        // Prevents access with tampered or expired tokens
        it('should reject invalid token', () => {
            mockRequest.headers = {
                authorization: 'Bearer invalid-token'
            }

            authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

            // Should return 403 Forbidden for invalid token
            expect(mockResponse.status).toHaveBeenCalledWith(403)
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid or expired token'
            })
            // Should NOT call next() - request is blocked
            expect(mockNext).not.toHaveBeenCalled()
        })
    })

    // Test role-based access control middleware
    // Enforces different permission levels (employee, manager, admin, etc.)
    describe('requireRole', () => {
        
        // Test access granted for authorized role
        // Users with correct role should access the resource
        it('should allow access for authorized role', () => {
            mockRequest.user = mockPayload
            const middleware = requireRole(['employee', 'manager'])

            middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

            // Should call next() to continue to route handler
            expect(mockNext).toHaveBeenCalled()
        })

        // Test access denied for unauthorized role
        // Users without required role should be blocked
        it('should deny access for unauthorized role', () => {
            mockRequest.user = mockPayload
            const middleware = requireRole(['manager', 'admin'])

            middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

            // Should return 403 Forbidden for insufficient permissions
            expect(mockResponse.status).toHaveBeenCalledWith(403)
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Insufficient permissions'
            })
            // Should NOT call next() - request is blocked
            expect(mockNext).not.toHaveBeenCalled()
        })

        // Test access denied without authentication
        // Role check requires user to be authenticated first
        it('should deny access without authentication', () => {
            const middleware = requireRole(['employee'])

            middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

            // Should return 401 Unauthorized when no user is set
            expect(mockResponse.status).toHaveBeenCalledWith(401)
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: 'Authentication required'
            })
            // Should NOT call next() - request is blocked
            expect(mockNext).not.toHaveBeenCalled()
        })
    })

    // Test optional authentication middleware
    // Allows both authenticated and anonymous access to routes
    describe('optionalAuth', () => {
        
        // Test user data is set when valid token is provided
        // Authenticated users get enhanced functionality
        it('should set user for valid token', () => {
            const token = generateAccessToken(mockPayload)
            mockRequest.headers = {
                authorization: `Bearer ${token}`
            }

            optionalAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

            // Should set user data for authenticated requests
            expect(mockRequest.user).toBeDefined()
            expect(mockRequest.user?.userId).toBe(mockPayload.userId)
            // Should always call next() - never blocks requests
            expect(mockNext).toHaveBeenCalled()
        })

        // Test graceful handling of invalid tokens
        // Invalid tokens don't block access, just no user data
        it('should continue without user for invalid token', () => {
            mockRequest.headers = {
                authorization: 'Bearer invalid-token'
            }

            optionalAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

            // Should not set user data for invalid token
            expect(mockRequest.user).toBeUndefined()
            // Should still call next() - allows anonymous access
            expect(mockNext).toHaveBeenCalled()
        })

        // Test handling when no token is provided
        // Anonymous users can still access the route
        it('should continue without user when no token provided', () => {
            optionalAuth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext)

            // Should not set user data when no token
            expect(mockRequest.user).toBeUndefined()
            // Should call next() - allows anonymous access
            expect(mockNext).toHaveBeenCalled()
        })
    })
})