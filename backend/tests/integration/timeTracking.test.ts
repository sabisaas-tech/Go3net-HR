import request from 'supertest'
import app from '../../src/server'
import { supabase } from '../../src/config/database'
import { generateTokens } from '../../src/utils/jwt'

jest.mock('../../src/config/database')

describe('Time Tracking API', () => {
    let employeeToken: string
    let managerToken: string
    let hrAdminToken: string
    let mockSupabase: jest.Mocked<typeof supabase>

    const mockLocation = {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        address: '123 Office St, New York, NY'
    }

    const mockTimeEntry = {
        id: 'time-123',
        employee_id: 'emp-123',
        check_in_time: '2023-06-01T09:00:00Z',
        check_out_time: null,
        check_in_location: mockLocation,
        check_out_location: null,
        location_status: 'valid',
        total_hours: null,
        status: 'checked_in',
        notes: 'Starting work',
        device_info: 'iPhone 12',
        created_at: '2023-06-01T09:00:00Z',
        updated_at: '2023-06-01T09:00:00Z'
    }

    beforeAll(() => {
        // Generate test tokens
        const employeePayload = { userId: 'emp-123', email: 'employee@example.com', role: 'employee' }
        const managerPayload = { userId: 'mgr-123', email: 'manager@example.com', role: 'manager' }
        const hrAdminPayload = { userId: 'hr-123', email: 'hr@example.com', role: 'hr-admin' }

        employeeToken = generateTokens(employeePayload).accessToken
        managerToken = generateTokens(managerPayload).accessToken
        hrAdminToken = generateTokens(hrAdminPayload).accessToken
    })

    beforeEach(() => {
        mockSupabase = supabase as jest.Mocked<typeof supabase>
        jest.clearAllMocks()
    })

    describe('POST /api/time-tracking/check-in', () => {
        const checkInData = {
            location: mockLocation,
            notes: 'Starting work',
            deviceInfo: 'iPhone 12'
        }

        it('should check in employee successfully', async () => {
            // Mock no active time entry
            mockSupabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            order: jest.fn().mockReturnValue({
                                limit: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({
                                        data: null,
                                        error: { message: 'No active entry' }
                                    })
                                })
                            })
                        })
                    })
                })
            } as any)

            // Mock time entry creation
            mockSupabase.from.mockReturnValueOnce({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: mockTimeEntry,
                            error: null
                        })
                    })
                })
            } as any)

            const response = await request(app)
                .post('/api/time-tracking/check-in')
                .set('Authorization', `Bearer ${employeeToken}`)
                .send(checkInData)

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data.timeEntry).toBeDefined()
            expect(response.body.data.timeEntry.status).toBe('checked_in')
        })

        it('should return 409 if employee is already checked in', async () => {
            // Mock existing active time entry
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            order: jest.fn().mockReturnValue({
                                limit: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({
                                        data: mockTimeEntry,
                                        error: null
                                    })
                                })
                            })
                        })
                    })
                })
            } as any)

            const response = await request(app)
                .post('/api/time-tracking/check-in')
                .set('Authorization', `Bearer ${employeeToken}`)
                .send(checkInData)

            expect(response.status).toBe(409)
            expect(response.body.success).toBe(false)
        })

        it('should return 401 without authentication', async () => {
            const response = await request(app)
                .post('/api/time-tracking/check-in')
                .send(checkInData)

            expect(response.status).toBe(401)
        })
    })

    describe('POST /api/time-tracking/check-in-fallback', () => {
        const fallbackData = {
            reason: 'GPS disabled by user',
            notes: 'Working from office but GPS not available',
            deviceInfo: 'iPhone 12'
        }

        it('should check in without location when fallback is allowed', async () => {
            // Mock no active time entry
            mockSupabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            order: jest.fn().mockReturnValue({
                                limit: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({
                                        data: null,
                                        error: { message: 'No active entry' }
                                    })
                                })
                            })
                        })
                    })
                })
            } as any)

            // Mock time entry creation
            mockSupabase.from.mockReturnValueOnce({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: { ...mockTimeEntry, location_status: 'unavailable', requires_manual_review: true },
                            error: null
                        })
                    })
                })
            } as any)

            const response = await request(app)
                .post('/api/time-tracking/check-in-fallback')
                .set('Authorization', `Bearer ${employeeToken}`)
                .send(fallbackData)

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.message).toContain('reviewed by HR')
        })

        it('should return 400 if reason is not provided', async () => {
            const response = await request(app)
                .post('/api/time-tracking/check-in-fallback')
                .set('Authorization', `Bearer ${employeeToken}`)
                .send({ notes: 'Test' })

            expect(response.status).toBe(400)
            expect(response.body.success).toBe(false)
        })
    })

    describe('POST /api/time-tracking/check-out', () => {
        const checkOutData = {
            location: mockLocation,
            notes: 'End of work',
            deviceInfo: 'iPhone 12'
        }

        it('should check out employee successfully', async () => {
            // Mock active time entry
            mockSupabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            order: jest.fn().mockReturnValue({
                                limit: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({
                                        data: mockTimeEntry,
                                        error: null
                                    })
                                })
                            })
                        })
                    })
                })
            } as any)

            const updatedTimeEntry = {
                ...mockTimeEntry,
                check_out_time: '2023-06-01T17:00:00Z',
                check_out_location: mockLocation,
                total_hours: 8,
                status: 'checked_out'
            }

            // Mock time entry update
            mockSupabase.from.mockReturnValueOnce({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({
                                data: updatedTimeEntry,
                                error: null
                            })
                        })
                    })
                })
            } as any)

            // Mock attendance record operations
            mockSupabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({
                                data: null,
                                error: { message: 'No existing record' }
                            })
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

            const response = await request(app)
                .post('/api/time-tracking/check-out')
                .set('Authorization', `Bearer ${employeeToken}`)
                .send(checkOutData)

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data.timeEntry.status).toBe('checked_out')
            expect(response.body.data.timeEntry.totalHours).toBe(8)
        })

        it('should return 404 if no active check-in found', async () => {
            // Mock no active time entry
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            order: jest.fn().mockReturnValue({
                                limit: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({
                                        data: null,
                                        error: { message: 'No active entry' }
                                    })
                                })
                            })
                        })
                    })
                })
            } as any)

            const response = await request(app)
                .post('/api/time-tracking/check-out')
                .set('Authorization', `Bearer ${employeeToken}`)
                .send(checkOutData)

            expect(response.status).toBe(404)
            expect(response.body.success).toBe(false)
        })
    })

    describe('GET /api/time-tracking/active', () => {
        it('should return active time entry', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            order: jest.fn().mockReturnValue({
                                limit: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({
                                        data: mockTimeEntry,
                                        error: null
                                    })
                                })
                            })
                        })
                    })
                })
            } as any)

            const response = await request(app)
                .get('/api/time-tracking/active')
                .set('Authorization', `Bearer ${employeeToken}`)

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data.timeEntry).toBeDefined()
            expect(response.body.data.timeEntry.status).toBe('checked_in')
        })

        it('should return null if no active time entry', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            order: jest.fn().mockReturnValue({
                                limit: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({
                                        data: null,
                                        error: { message: 'No active entry' }
                                    })
                                })
                            })
                        })
                    })
                })
            } as any)

            const response = await request(app)
                .get('/api/time-tracking/active')
                .set('Authorization', `Bearer ${employeeToken}`)

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data.timeEntry).toBeNull()
        })
    })

    describe('GET /api/time-tracking/entries', () => {
        const mockTimeEntries = [
            mockTimeEntry,
            {
                ...mockTimeEntry,
                id: 'time-456',
                check_out_time: '2023-06-01T17:00:00Z',
                total_hours: 8,
                status: 'checked_out'
            }
        ]

        it('should return time entries for employee', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({
                            data: mockTimeEntries,
                            error: null
                        })
                    })
                })
            } as any)

            const response = await request(app)
                .get('/api/time-tracking/entries')
                .set('Authorization', `Bearer ${employeeToken}`)

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data.entries).toHaveLength(2)
            expect(response.body.data.total).toBe(2)
        })

        it('should support date filtering', async () => {
            const mockQuery = {
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockReturnValue({
                            gte: jest.fn().mockReturnValue({
                                lte: jest.fn().mockResolvedValue({
                                    data: [mockTimeEntries[0]],
                                    error: null
                                })
                            })
                        })
                    })
                })
            }

            mockSupabase.from.mockReturnValue(mockQuery as any)

            const response = await request(app)
                .get('/api/time-tracking/entries?startDate=2023-06-01&endDate=2023-06-01')
                .set('Authorization', `Bearer ${employeeToken}`)

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
        })

        it('should support pagination', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({
                            data: mockTimeEntries,
                            error: null
                        })
                    })
                })
            } as any)

            const response = await request(app)
                .get('/api/time-tracking/entries?limit=1&offset=0')
                .set('Authorization', `Bearer ${employeeToken}`)

            expect(response.status).toBe(200)
            expect(response.body.data.entries).toHaveLength(1)
            expect(response.body.data.limit).toBe(1)
            expect(response.body.data.offset).toBe(0)
        })
    })

    describe('GET /api/time-tracking/attendance/:date', () => {
        const mockAttendanceRecord = {
            employee_id: 'emp-123',
            date: '2023-06-01',
            check_in_time: '2023-06-01T09:00:00Z',
            check_out_time: '2023-06-01T17:00:00Z',
            total_hours: 8,
            regular_hours: 8,
            overtime_hours: 0,
            break_time: 0,
            status: 'present',
            late_minutes: 0,
            early_leave_minutes: 0
        }

        it('should return attendance record for valid date', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({
                                data: mockAttendanceRecord,
                                error: null
                            })
                        })
                    })
                })
            } as any)

            const response = await request(app)
                .get('/api/time-tracking/attendance/2023-06-01')
                .set('Authorization', `Bearer ${employeeToken}`)

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data.attendance.date).toBe('2023-06-01')
            expect(response.body.data.attendance.status).toBe('present')
        })

        it('should return 400 for invalid date format', async () => {
            const response = await request(app)
                .get('/api/time-tracking/attendance/invalid-date')
                .set('Authorization', `Bearer ${employeeToken}`)

            expect(response.status).toBe(400)
            expect(response.body.success).toBe(false)
        })

        it('should return 404 if no attendance record found', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({
                                data: null,
                                error: { message: 'No record found' }
                            })
                        })
                    })
                })
            } as any)

            const response = await request(app)
                .get('/api/time-tracking/attendance/2023-06-01')
                .set('Authorization', `Bearer ${employeeToken}`)

            expect(response.status).toBe(404)
            expect(response.body.success).toBe(false)
        })
    })

    describe('GET /api/time-tracking/attendance', () => {
        const mockAttendanceRecords = [
            {
                employee_id: 'emp-123',
                date: '2023-06-01',
                total_hours: 8,
                status: 'present'
            },
            {
                employee_id: 'emp-123',
                date: '2023-06-02',
                total_hours: 9,
                status: 'present'
            }
        ]

        it('should return attendance records for date range', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        gte: jest.fn().mockReturnValue({
                            lte: jest.fn().mockReturnValue({
                                order: jest.fn().mockResolvedValue({
                                    data: mockAttendanceRecords,
                                    error: null
                                })
                            })
                        })
                    })
                })
            } as any)

            const response = await request(app)
                .get('/api/time-tracking/attendance?startDate=2023-06-01&endDate=2023-06-02')
                .set('Authorization', `Bearer ${employeeToken}`)

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data.attendance).toHaveLength(2)
            expect(response.body.data.total).toBe(2)
        })

        it('should return 400 if date parameters are missing', async () => {
            const response = await request(app)
                .get('/api/time-tracking/attendance')
                .set('Authorization', `Bearer ${employeeToken}`)

            expect(response.status).toBe(400)
            expect(response.body.success).toBe(false)
        })
    })

    describe('POST /api/time-tracking/validate-location', () => {
        it('should validate location successfully', async () => {
            const response = await request(app)
                .post('/api/time-tracking/validate-location')
                .set('Authorization', `Bearer ${employeeToken}`)
                .send({ location: mockLocation })

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data.validation).toBeDefined()
            expect(response.body.data.validation.recommendations).toBeDefined()
        })

        it('should return 400 if location is missing', async () => {
            const response = await request(app)
                .post('/api/time-tracking/validate-location')
                .set('Authorization', `Bearer ${employeeToken}`)
                .send({})

            expect(response.status).toBe(400)
            expect(response.body.success).toBe(false)
        })
    })

    describe('Permission-based access', () => {
        it('should deny access without proper permissions', async () => {
            // Create token without time.log permission
            const noPermissionPayload = { userId: 'emp-456', email: 'noperm@example.com', role: 'restricted' }
            const noPermissionToken = generateTokens(noPermissionPayload).accessToken

            const response = await request(app)
                .post('/api/time-tracking/check-in')
                .set('Authorization', `Bearer ${noPermissionToken}`)
                .send({ location: mockLocation })

            expect(response.status).toBe(403)
        })

        it('should allow manager access to team endpoints', async () => {
            const response = await request(app)
                .get('/api/time-tracking/team/entries')
                .set('Authorization', `Bearer ${managerToken}`)

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
        })

        it('should allow HR admin access to admin endpoints', async () => {
            const response = await request(app)
                .get('/api/time-tracking/admin/entries')
                .set('Authorization', `Bearer ${hrAdminToken}`)

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
        })
    })
})