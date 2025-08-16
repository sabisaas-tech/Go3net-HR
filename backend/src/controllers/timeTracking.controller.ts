import { Request, Response } from 'express'
import { TimeTrackingService, CheckInData, CheckOutData, Location } from '../services/timeTracking.service'
import { ResponseHandler } from '../utils/response'
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors'
import { AuthenticatedRequest } from '../middleware/permission'

export class TimeTrackingController {
    private timeTrackingService: TimeTrackingService

    constructor() {
        this.timeTrackingService = new TimeTrackingService()
    }

    /**
     * Check in employee
     * POST /api/time-tracking/check-in
     */
    async checkIn(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const employeeId = req.user?.id!
            const { location, notes, deviceInfo } = req.body

            const checkInData: CheckInData = {
                employeeId,
                location,
                notes,
                deviceInfo
            }

            const result = await this.timeTrackingService.checkIn(checkInData)

            if (result.success) {
                return ResponseHandler.success(res, result.message, {
                    timeEntry: result.timeEntry
                })
            }

            return ResponseHandler.badRequest(res, result.message)
        } catch (error) {
            if (error instanceof ConflictError) {
                return ResponseHandler.conflict(res, error.message)
            }
            if (error instanceof ValidationError) {
                return ResponseHandler.badRequest(res, error.message)
            }
            return ResponseHandler.internalError(res, 'Failed to check in')
        }
    }

    /**
     * Check in without location (fallback)
     * POST /api/time-tracking/check-in-fallback
     */
    async checkInFallback(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const employeeId = req.user?.id!
            const { reason, notes, deviceInfo } = req.body

            if (!reason) {
                return ResponseHandler.badRequest(res, 'Reason for location unavailability is required')
            }

            const result = await this.timeTrackingService.checkInWithoutLocation(
                employeeId,
                reason,
                notes,
                deviceInfo
            )

            if (result.success) {
                return ResponseHandler.success(res, result.message, {
                    timeEntry: result.timeEntry
                })
            }

            return ResponseHandler.badRequest(res, result.message)
        } catch (error) {
            if (error instanceof ConflictError) {
                return ResponseHandler.conflict(res, error.message)
            }
            if (error instanceof ValidationError) {
                return ResponseHandler.badRequest(res, error.message)
            }
            return ResponseHandler.internalError(res, 'Failed to check in without location')
        }
    }

    /**
     * Check out employee
     * POST /api/time-tracking/check-out
     */
    async checkOut(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const employeeId = req.user?.id!
            const { location, notes, deviceInfo } = req.body

            const checkOutData: CheckOutData = {
                location,
                notes,
                deviceInfo
            }

            const result = await this.timeTrackingService.checkOut(employeeId, checkOutData)

            if (result.success) {
                return ResponseHandler.success(res, result.message, {
                    timeEntry: result.timeEntry
                })
            }

            return ResponseHandler.badRequest(res, result.message)
        } catch (error) {
            if (error instanceof NotFoundError) {
                return ResponseHandler.notFound(res, error.message)
            }
            if (error instanceof ValidationError) {
                return ResponseHandler.badRequest(res, error.message)
            }
            return ResponseHandler.internalError(res, 'Failed to check out')
        }
    }

    /**
     * Get current active time entry
     * GET /api/time-tracking/active
     */
    async getActiveEntry(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const employeeId = req.user?.id!
            const activeEntry = await this.timeTrackingService.getActiveTimeEntry(employeeId)

            if (!activeEntry) {
                return ResponseHandler.success(res, 'No active time entry found', { timeEntry: null })
            }

            return ResponseHandler.success(res, 'Active time entry retrieved', {
                timeEntry: activeEntry
            })
        } catch (error) {
            return ResponseHandler.internalError(res, 'Failed to get active time entry')
        }
    }

    /**
     * Get time entries for employee
     * GET /api/time-tracking/entries
     */
    async getTimeEntries(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const employeeId = req.user?.id!
            const { startDate, endDate, limit = '50', offset = '0' } = req.query

            const entries = await this.timeTrackingService.getTimeEntries(
                employeeId,
                startDate as string,
                endDate as string
            )

            // Apply pagination
            const limitNum = parseInt(limit as string)
            const offsetNum = parseInt(offset as string)
            const paginatedEntries = entries.slice(offsetNum, offsetNum + limitNum)

            return ResponseHandler.success(res, 'Time entries retrieved successfully', {
                entries: paginatedEntries,
                total: entries.length,
                limit: limitNum,
                offset: offsetNum
            })
        } catch (error) {
            return ResponseHandler.internalError(res, 'Failed to get time entries')
        }
    }

    /**
     * Get current status
     * GET /api/time-tracking/status
     */
    async getStatus(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const employeeId = req.user?.id!
            const activeEntry = await this.timeTrackingService.getActiveTimeEntry(employeeId)

            const today = new Date().toISOString().split('T')[0]
            const todayAttendance = await this.timeTrackingService.getAttendanceRecord(employeeId, today)

            const statusPayload: any = {
                status: activeEntry ? 'checked_in' : 'checked_out',
                since: activeEntry ? activeEntry.checkInTime : undefined,
                activeEntry: activeEntry || null
            }

            if (todayAttendance) {
                statusPayload.today = {
                    date: todayAttendance.date,
                    totalHours: todayAttendance.totalHours,
                    regularHours: todayAttendance.regularHours,
                    overtimeHours: todayAttendance.overtimeHours,
                    status: todayAttendance.status,
                    lateMinutes: todayAttendance.lateMinutes,
                    earlyLeaveMinutes: todayAttendance.earlyLeaveMinutes
                }
            }

            return ResponseHandler.success(res, 'Time tracking status retrieved', statusPayload)
        } catch (error) {
            return ResponseHandler.internalError(res, 'Failed to get time tracking status')
        }
    }
    async getAttendanceRecord(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const employeeId = req.user?.id!
            const { date } = req.params

            // Validate date format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return ResponseHandler.badRequest(res, 'Invalid date format. Use YYYY-MM-DD')
            }

            const attendanceRecord = await this.timeTrackingService.getAttendanceRecord(employeeId, date)

            if (!attendanceRecord) {
                return ResponseHandler.notFound(res, 'No attendance record found for this date')
            }

            return ResponseHandler.success(res, 'Attendance record retrieved successfully', {
                attendance: attendanceRecord
            })
        } catch (error) {
            return ResponseHandler.internalError(res, 'Failed to get attendance record')
        }
    }

    /**
     * Get attendance records for date range
     * GET /api/time-tracking/attendance
     */
    async getAttendanceRecords(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const employeeId = req.user?.id!
            const { startDate, endDate } = req.query

            if (!startDate || !endDate) {
                return ResponseHandler.badRequest(res, 'Start date and end date are required')
            }

            // Validate date formats
            if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate as string) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate as string)) {
                return ResponseHandler.badRequest(res, 'Invalid date format. Use YYYY-MM-DD')
            }

            const attendanceRecords = await this.timeTrackingService.getAttendanceRecords(
                employeeId,
                startDate as string,
                endDate as string
            )

            return ResponseHandler.success(res, 'Attendance records retrieved successfully', {
                attendance: attendanceRecords,
                total: attendanceRecords.length,
                period: {
                    startDate,
                    endDate
                }
            })
        } catch (error) {
            return ResponseHandler.internalError(res, 'Failed to get attendance records')
        }
    }

    /**
     * Get work hours summary
     * GET /api/time-tracking/summary
     */
    async getWorkHoursSummary(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const employeeId = req.user?.id!
            const { startDate, endDate } = req.query

            if (!startDate || !endDate) {
                return ResponseHandler.badRequest(res, 'Start date and end date are required')
            }

            // Validate date formats
            if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate as string) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate as string)) {
                return ResponseHandler.badRequest(res, 'Invalid date format. Use YYYY-MM-DD')
            }

            const summary = await this.timeTrackingService.getWorkHoursSummary(
                employeeId,
                startDate as string,
                endDate as string
            )

            return ResponseHandler.success(res, 'Work hours summary generated successfully', {
                summary
            })
        } catch (error) {
            return ResponseHandler.internalError(res, 'Failed to generate work hours summary')
        }
    }

    /**
     * Validate location for employee
     * POST /api/time-tracking/validate-location
     */
    async validateLocation(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const employeeId = req.user?.id!
            const { location } = req.body

            if (!location || !location.latitude || !location.longitude) {
                return ResponseHandler.badRequest(res, 'Location with latitude and longitude is required')
            }

            const validation = await this.timeTrackingService.validateLocationForEmployee(employeeId, location)

            return ResponseHandler.success(res, 'Location validation completed', {
                validation
            })
        } catch (error) {
            return ResponseHandler.internalError(res, 'Failed to validate location')
        }
    }

    /**
     * Get time entries for manager (team members)
     * GET /api/time-tracking/team/entries
     */
    async getTeamTimeEntries(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const managerId = req.user?.id!
            const { startDate, endDate, employeeId } = req.query

            // This would require integration with employee service to get team members
            // For now, return a placeholder response
            return ResponseHandler.success(res, 'Team time entries feature coming soon', {
                message: 'This endpoint will show time entries for team members under this manager'
            })
        } catch (error) {
            return ResponseHandler.internalError(res, 'Failed to get team time entries')
        }
    }

    /**
     * Get attendance statistics for manager
     * GET /api/time-tracking/team/statistics
     */
    async getTeamStatistics(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const managerId = req.user?.id!
            const { startDate, endDate } = req.query

            // This would require integration with employee service to get team members
            // For now, return a placeholder response
            return ResponseHandler.success(res, 'Team statistics feature coming soon', {
                message: 'This endpoint will show attendance statistics for team members under this manager'
            })
        } catch (error) {
            return ResponseHandler.internalError(res, 'Failed to get team statistics')
        }
    }

    /**
     * Admin endpoint: Get all time entries with filters
     * GET /api/time-tracking/admin/entries
     */
    async getAllTimeEntries(req: Request, res: Response): Promise<Response> {
        try {
            const { employeeId, startDate, endDate, status, limit = '100', offset = '0' } = req.query

            // This would require admin permissions and integration with employee service
            // For now, return a placeholder response
            return ResponseHandler.success(res, 'Admin time entries feature coming soon', {
                message: 'This endpoint will show all time entries with admin filters'
            })
        } catch (error) {
            return ResponseHandler.internalError(res, 'Failed to get all time entries')
        }
    }

    /**
     * Admin endpoint: Get attendance report
     * GET /api/time-tracking/admin/report
     */
    async getAttendanceReport(req: Request, res: Response): Promise<Response> {
        try {
            const { startDate, endDate, departmentId, format = 'json' } = req.query

            // This would require admin permissions and integration with employee service
            // For now, return a placeholder response
            return ResponseHandler.success(res, 'Attendance report feature coming soon', {
                message: 'This endpoint will generate comprehensive attendance reports'
            })
        } catch (error) {
            return ResponseHandler.internalError(res, 'Failed to generate attendance report')
        }
    }
}