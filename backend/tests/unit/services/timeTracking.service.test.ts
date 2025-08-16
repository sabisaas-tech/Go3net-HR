import { TimeTrackingService, CheckInData, CheckOutData, Location } from '../../../src/services/timeTracking.service'
import { supabase } from '../../../src/config/database'
import { ConflictError, NotFoundError, ValidationError } from '../../../src/utils/errors'

jest.mock('../../../src/config/database')

describe('TimeTrackingService', () => {
    let timeTrackingService: TimeTrackingService
    let mockSupabase: jest.Mocked<typeof supabase>

    const mockLocation: Location = {
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
        total_hours: null,
        status: 'checked_in',
        notes: 'Starting work',
        device_info: 'iPhone 12',
        created_at: '2023-06-01T09:00:00Z',
        updated_at: '2023-06-01T09:00:00Z'
    }

    beforeAll(() => {
        // Set environment variables for testing
        process.env.OFFICE_LATITUDE = '40.7128'
        process.env.OFFICE_LONGITUDE = '-74.0060'
        process.env.REQUIRE_OFFICE_LOCATION = 'false'
    })

    beforeEach(() => {
        jest.clearAllMocks()
        timeTrackingService = new TimeTrackingService()
        mockSupabase = supabase as jest.Mocked<typeof supabase>
    })

    describe('checkIn', () => {
        const checkInData: CheckInData = {
            employeeId: 'emp-123',
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

            const result = await timeTrackingService.checkIn(checkInData)

            expect(result.success).toBe(true)
            expect(result.message).toContain('Check-in')
            expect(result.timeEntry?.employeeId).toBe('emp-123')
            expect(result.timeEntry?.status).toBe('checked_in')
        })

        it('should throw ConflictError if employee is already checked in', async () => {
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

            await expect(timeTrackingService.checkIn(checkInData))
                .rejects.toThrow(ConflictError)
        })

        it('should throw ValidationError for invalid location', async () => {
            // Set environment to require location validation
            process.env.REQUIRE_OFFICE_LOCATION = 'true'

            const invalidCheckInData = {
                ...checkInData,
                location: {
                    latitude: 200, // Invalid latitude
                    longitude: -74.0060
                }
            }

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

            await expect(timeTrackingService.checkIn(invalidCheckInData))
                .rejects.toThrow(ValidationError)

            // Reset environment
            process.env.REQUIRE_OFFICE_LOCATION = 'false'
        })

        it('should check in without location', async () => {
            const checkInDataNoLocation = {
                employeeId: 'emp-123',
                notes: 'Starting work',
                deviceInfo: 'iPhone 12'
            }

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
                            data: { ...mockTimeEntry, check_in_location: null },
                            error: null
                        })
                    })
                })
            } as any)

            const result = await timeTrackingService.checkIn(checkInDataNoLocation)

            expect(result.success).toBe(true)
            expect(result.timeEntry?.checkInLocation).toBeNull()
        })
    })

    describe('checkOut', () => {
        const checkOutData: CheckOutData = {
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

            // Mock attendance record creation/update
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

            const result = await timeTrackingService.checkOut('emp-123', checkOutData)

            expect(result.success).toBe(true)
            expect(result.message).toBe('Check-out successful')
            expect(result.timeEntry?.status).toBe('checked_out')
            expect(result.timeEntry?.totalHours).toBe(8)
        })

        it('should throw NotFoundError if no active check-in found', async () => {
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

            await expect(timeTrackingService.checkOut('emp-123', checkOutData))
                .rejects.toThrow(NotFoundError)
        })

        it('should throw ValidationError for invalid checkout location', async () => {
            const invalidCheckOutData = {
                ...checkOutData,
                location: {
                    latitude: -200, // Invalid latitude
                    longitude: -74.0060
                }
            }

            // Mock active time entry
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

            await expect(timeTrackingService.checkOut('emp-123', invalidCheckOutData))
                .rejects.toThrow(ValidationError)
        })
    })

    describe('getActiveTimeEntry', () => {
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

            const result = await timeTrackingService.getActiveTimeEntry('emp-123')

            expect(result).toBeTruthy()
            expect(result?.employeeId).toBe('emp-123')
            expect(result?.status).toBe('checked_in')
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

            const result = await timeTrackingService.getActiveTimeEntry('emp-123')

            expect(result).toBeNull()
        })
    })

    describe('getTimeEntries', () => {
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

            const result = await timeTrackingService.getTimeEntries('emp-123')

            expect(result).toHaveLength(2)
            expect(result[0].employeeId).toBe('emp-123')
        })

        it('should return time entries with date filtering', async () => {
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

            const result = await timeTrackingService.getTimeEntries(
                'emp-123',
                '2023-06-01',
                '2023-06-01'
            )

            expect(result).toHaveLength(1)
        })

        it('should return empty array on error', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'Database error' }
                        })
                    })
                })
            } as any)

            const result = await timeTrackingService.getTimeEntries('emp-123')

            expect(result).toEqual([])
        })
    })

    describe('getAttendanceRecord', () => {
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

        it('should return attendance record for date', async () => {
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

            const result = await timeTrackingService.getAttendanceRecord('emp-123', '2023-06-01')

            expect(result).toBeTruthy()
            expect(result?.employeeId).toBe('emp-123')
            expect(result?.date).toBe('2023-06-01')
            expect(result?.status).toBe('present')
        })

        it('should return null if no attendance record found', async () => {
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

            const result = await timeTrackingService.getAttendanceRecord('emp-123', '2023-06-01')

            expect(result).toBeNull()
        })
    })

    describe('getAttendanceRecords', () => {
        const mockAttendanceRecords = [
            {
                employee_id: 'emp-123',
                date: '2023-06-01',
                total_hours: 8,
                regular_hours: 8,
                overtime_hours: 0,
                status: 'present',
                late_minutes: 0,
                early_leave_minutes: 0
            },
            {
                employee_id: 'emp-123',
                date: '2023-06-02',
                total_hours: 9,
                regular_hours: 8,
                overtime_hours: 1,
                status: 'present',
                late_minutes: 15,
                early_leave_minutes: 0
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

            const result = await timeTrackingService.getAttendanceRecords(
                'emp-123',
                '2023-06-01',
                '2023-06-02'
            )

            expect(result).toHaveLength(2)
            expect(result[0].employeeId).toBe('emp-123')
        })
    })

    describe('getWorkHoursSummary', () => {
        const mockAttendanceRecords = [
            {
                employee_id: 'emp-123',
                date: '2023-06-01',
                total_hours: 8,
                regular_hours: 8,
                overtime_hours: 0,
                status: 'present',
                late_minutes: 0
            },
            {
                employee_id: 'emp-123',
                date: '2023-06-02',
                total_hours: 9,
                regular_hours: 8,
                overtime_hours: 1,
                status: 'present',
                late_minutes: 15
            }
        ]

        it('should calculate work hours summary', async () => {
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

            const result = await timeTrackingService.getWorkHoursSummary(
                'emp-123',
                '2023-06-01',
                '2023-06-02'
            )

            expect(result.employeeId).toBe('emp-123')
            expect(result.totalHours).toBe(17)
            expect(result.regularHours).toBe(16)
            expect(result.overtimeHours).toBe(1)
            expect(result.presentDays).toBe(2)
            expect(result.lateDays).toBe(1)
            expect(result.averageHoursPerDay).toBe(8.5)
        })
    })

    describe('location validation', () => {
        beforeEach(() => {
            process.env.REQUIRE_OFFICE_LOCATION = 'true'
        })

        afterEach(() => {
            process.env.REQUIRE_OFFICE_LOCATION = 'false'
        })

        it('should validate location within office bounds', async () => {
            const nearOfficeLocation = {
                latitude: 40.7129, // Very close to office
                longitude: -74.0061,
                accuracy: 5
            }

            const checkInData: CheckInData = {
                employeeId: 'emp-123',
                location: nearOfficeLocation
            }

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

            const result = await timeTrackingService.checkIn(checkInData)

            expect(result.success).toBe(true)
        })

        it('should handle low accuracy GPS with warning', async () => {
            const lowAccuracyLocation = {
                latitude: 40.7128,
                longitude: -74.0060,
                accuracy: 150 // Low accuracy
            }

            const checkInData: CheckInData = {
                employeeId: 'emp-123',
                location: lowAccuracyLocation
            }

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

            const result = await timeTrackingService.checkIn(checkInData)

            expect(result.success).toBe(true)
            expect(result.message).toContain('location accuracy is low')
        })

        it('should reject invalid GPS coordinates', async () => {
            const invalidLocation = {
                latitude: 200, // Invalid
                longitude: -74.0060
            }

            const checkInData: CheckInData = {
                employeeId: 'emp-123',
                location: invalidLocation
            }

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

            await expect(timeTrackingService.checkIn(checkInData))
                .rejects.toThrow(ValidationError)
        })

        it('should reject check-in when location is required but not provided', async () => {
            const checkInData: CheckInData = {
                employeeId: 'emp-123'
                // No location provided
            }

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

            await expect(timeTrackingService.checkIn(checkInData))
                .rejects.toThrow(ValidationError)
        })
    })

    describe('checkInWithoutLocation', () => {
        beforeAll(() => {
            process.env.ALLOW_LOCATION_FALLBACK = 'true'
        })

        afterAll(() => {
            process.env.ALLOW_LOCATION_FALLBACK = 'false'
        })

        it('should allow check-in without location when fallback is enabled', async () => {
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

            const result = await timeTrackingService.checkInWithoutLocation(
                'emp-123',
                'GPS disabled by user',
                'Working from office but GPS not available'
            )

            expect(result.success).toBe(true)
            expect(result.message).toContain('reviewed by HR')
        })
    })

    describe('validateLocationForEmployee', () => {
        it('should provide location validation with recommendations', async () => {
            const location = {
                latitude: 40.7128,
                longitude: -74.0060,
                accuracy: 150
            }

            const result = await timeTrackingService.validateLocationForEmployee('emp-123', location)

            expect(result.status).toBe('low_accuracy')
            expect(result.recommendations).toContain('Move to an open area for better GPS signal')
            expect(result.distance).toBeDefined()
        })

        it('should provide recommendations for invalid location', async () => {
            const invalidLocation = {
                latitude: NaN,
                longitude: -74.0060
            }

            const result = await timeTrackingService.validateLocationForEmployee('emp-123', invalidLocation)

            expect(result.isValid).toBe(false)
            expect(result.status).toBe('invalid')
            expect(result.recommendations).toContain('Check if GPS is enabled on your device')
        })
    })
})