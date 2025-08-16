import { schedulerService } from '../../../src/services/scheduler.service'
import { taskNotificationService } from '../../../src/services/taskNotification.service'
import cron from 'node-cron'

// Mock dependencies
jest.mock('../../../src/services/taskNotification.service')
jest.mock('node-cron')

const mockTaskNotificationService = taskNotificationService as jest.Mocked<typeof taskNotificationService>
const mockCron = cron as jest.Mocked<typeof cron>

describe('SchedulerService', () => {
  let mockScheduledTask: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock scheduled task
    mockScheduledTask = {
      start: jest.fn(),
      stop: jest.fn(),
      getStatus: jest.fn().mockReturnValue('scheduled')
    }
    
    mockCron.schedule.mockReturnValue(mockScheduledTask)
  })

  describe('init', () => {
    it('should initialize all scheduled jobs', () => {
      schedulerService.init()

      // Should create due date reminders job
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '0 9 * * *', // Daily at 9 AM
        expect.any(Function),
        expect.objectContaining({
          scheduled: false,
          timezone: 'UTC'
        })
      )

      // Should create cleanup job
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '0 2 * * 0', // Sunday at 2 AM
        expect.any(Function),
        expect.objectContaining({
          scheduled: false,
          timezone: 'UTC'
        })
      )

      // Should start the jobs
      expect(mockScheduledTask.start).toHaveBeenCalledTimes(2)
    })
  })

  describe('runDueDateRemindersNow', () => {
    it('should run due date reminders immediately', async () => {
      mockTaskNotificationService.processDueDateReminders.mockResolvedValue(undefined)

      await schedulerService.runDueDateRemindersNow()

      expect(mockTaskNotificationService.processDueDateReminders).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Processing failed')
      mockTaskNotificationService.processDueDateReminders.mockRejectedValue(error)

      await expect(schedulerService.runDueDateRemindersNow()).rejects.toThrow('Processing failed')
    })
  })

  describe('stopJob', () => {
    beforeEach(() => {
      schedulerService.init()
    })

    it('should stop a specific job', () => {
      const result = schedulerService.stopJob('dueDateReminders')

      expect(result).toBe(true)
      expect(mockScheduledTask.stop).toHaveBeenCalled()
    })

    it('should return false for non-existent job', () => {
      const result = schedulerService.stopJob('nonExistentJob')

      expect(result).toBe(false)
    })
  })

  describe('startJob', () => {
    beforeEach(() => {
      schedulerService.init()
    })

    it('should start a specific job', () => {
      const result = schedulerService.startJob('dueDateReminders')

      expect(result).toBe(true)
      expect(mockScheduledTask.start).toHaveBeenCalled()
    })

    it('should return false for non-existent job', () => {
      const result = schedulerService.startJob('nonExistentJob')

      expect(result).toBe(false)
    })
  })

  describe('stopAll', () => {
    beforeEach(() => {
      schedulerService.init()
    })

    it('should stop all jobs', () => {
      schedulerService.stopAll()

      // Should stop both jobs (due date reminders and cleanup)
      expect(mockScheduledTask.stop).toHaveBeenCalledTimes(2)
    })
  })

  describe('getJobStatus', () => {
    beforeEach(() => {
      schedulerService.init()
    })

    it('should return status of all jobs', () => {
      const status = schedulerService.getJobStatus()

      expect(status).toEqual({
        dueDateReminders: true,
        cleanup: true
      })
    })
  })

  describe('scheduleOneTimeNotification', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should schedule a one-time notification', async () => {
      const futureTime = new Date(Date.now() + 60000) // 1 minute from now
      const userId = 'user-123'
      const templateType = 'system_announcement'
      const variables = { message: 'Test notification' }

      schedulerService.scheduleOneTimeNotification(userId, templateType, variables, futureTime)

      // Fast-forward time
      jest.advanceTimersByTime(60000)

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0))

      // The notification should be scheduled (we can't easily test the actual sending without more complex mocking)
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 60000)
    })

    it('should throw error for past schedule time', () => {
      const pastTime = new Date(Date.now() - 60000) // 1 minute ago
      const userId = 'user-123'
      const templateType = 'system_announcement'
      const variables = { message: 'Test notification' }

      expect(() => {
        schedulerService.scheduleOneTimeNotification(userId, templateType, variables, pastTime)
      }).toThrow('Schedule time must be in the future')
    })
  })

  describe('scheduleUserTaskReminders', () => {
    it('should schedule user-specific task reminders', () => {
      const userId = 'user-123'
      const cronExpression = '0 8 * * *' // Daily at 8 AM

      const jobId = schedulerService.scheduleUserTaskReminders(userId, cronExpression)

      expect(jobId).toMatch(/^userReminders_user-123_\d+$/)
      expect(mockCron.schedule).toHaveBeenCalledWith(
        cronExpression,
        expect.any(Function),
        expect.objectContaining({
          scheduled: false,
          timezone: 'UTC'
        })
      )
      expect(mockScheduledTask.start).toHaveBeenCalled()
    })
  })

  describe('removeUserTaskReminders', () => {
    it('should remove all reminders for a specific user', () => {
      const userId = 'user-123'
      
      // First schedule some reminders
      schedulerService.scheduleUserTaskReminders(userId, '0 8 * * *')
      schedulerService.scheduleUserTaskReminders(userId, '0 18 * * *')

      const removedCount = schedulerService.removeUserTaskReminders(userId)

      expect(removedCount).toBe(2)
      expect(mockScheduledTask.stop).toHaveBeenCalledTimes(2)
    })

    it('should return 0 when no reminders exist for user', () => {
      const removedCount = schedulerService.removeUserTaskReminders('nonexistent-user')

      expect(removedCount).toBe(0)
    })
  })

  describe('scheduled job execution', () => {
    it('should execute due date reminders job', async () => {
      mockTaskNotificationService.processDueDateReminders.mockResolvedValue(undefined)
      
      schedulerService.init()

      // Get the scheduled function and execute it
      const scheduledFunction = mockCron.schedule.mock.calls[0][1]
      await scheduledFunction()

      expect(mockTaskNotificationService.processDueDateReminders).toHaveBeenCalled()
    })

    it('should handle errors in scheduled jobs', async () => {
      mockTaskNotificationService.processDueDateReminders.mockRejectedValue(new Error('Job failed'))
      
      schedulerService.init()

      // Get the scheduled function and execute it
      const scheduledFunction = mockCron.schedule.mock.calls[0][1]
      
      // Should not throw error (errors are caught and logged)
      await expect(scheduledFunction()).resolves.toBeUndefined()
    })
  })
})