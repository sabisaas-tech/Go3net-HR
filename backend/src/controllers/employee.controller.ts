import { Request, Response } from 'express'
import { EmployeeService, CreateEmployeeData, UpdateEmployeeData, EmployeeSearchFilters, Employee } from '../services/employee.service'
import { ResponseHandler } from '../utils/response'
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors'
import { AuthenticatedRequest } from '../middleware/permission'

export class EmployeeController {
  private employeeService: EmployeeService

  constructor() {
    this.employeeService = new EmployeeService()
  }

  /**
   * Create a new employee
   * POST /api/employees
   */
  async createEmployee(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const employeeData: CreateEmployeeData = req.body
      const createdBy = req.user?.id!

      const result = await this.employeeService.createEmployee(employeeData, createdBy)

      if (result.success) {
        return ResponseHandler.created(res, result.message, {
          employee: result.employee,
          temporaryPassword: result.temporaryPassword
        })
      }

      return ResponseHandler.badRequest(res, result.message)
    } catch (error) {
      if (error instanceof ValidationError) {
        return ResponseHandler.validationError(res, error.errors || [error.message])
      }
      if (error instanceof ConflictError) {
        return ResponseHandler.conflict(res, error.message)
      }
      return ResponseHandler.internalError(res, 'Failed to create employee')
    }
  }

  /**
   * Get all employees with optional filtering
   * GET /api/employees
   */
  async getEmployees(req: Request, res: Response): Promise<Response> {
    try {
      const filters: EmployeeSearchFilters = {
        departmentId: req.query.departmentId as string,
        positionId: req.query.positionId as string,
        managerId: req.query.managerId as string,
        employmentStatus: req.query.employmentStatus as string,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      }

      const result = await this.employeeService.searchEmployees(filters)

      if (result.success) {
        return ResponseHandler.success(res, result.message, {
          employees: result.employees,
          total: result.total,
          limit: filters.limit,
          offset: filters.offset
        })
      }

      return ResponseHandler.internalError(res, result.message)
    } catch (error) {
      return ResponseHandler.internalError(res, 'Failed to retrieve employees')
    }
  }

  /**
   * Get employee by ID
   * GET /api/employees/:id
   */
  async getEmployeeById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params
      const employee = await this.employeeService.getEmployeeById(id)

      if (!employee) {
        return ResponseHandler.notFound(res, 'Employee not found')
      }

      return ResponseHandler.success(res, 'Employee retrieved successfully', { employee })
    } catch (error) {
      return ResponseHandler.internalError(res, 'Failed to retrieve employee')
    }
  }

  /**
   * Get employee by employee ID
   * GET /api/employees/employee-id/:employeeId
   */
  async getEmployeeByEmployeeId(req: Request, res: Response): Promise<Response> {
    try {
      const { employeeId } = req.params
      const employee = await this.employeeService.getEmployeeByEmployeeId(employeeId)

      if (!employee) {
        return ResponseHandler.notFound(res, 'Employee not found')
      }

      return ResponseHandler.success(res, 'Employee retrieved successfully', { employee })
    } catch (error) {
      return ResponseHandler.internalError(res, 'Failed to retrieve employee')
    }
  }

  /**
   * Update employee
   * PUT /api/employees/:id
   */
  async updateEmployee(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params
      const updateData: UpdateEmployeeData = req.body
      const updatedBy = req.user?.id!

      const result = await this.employeeService.updateEmployee(id, updateData, updatedBy)

      if (result.success) {
        return ResponseHandler.success(res, result.message, { employee: result.employee })
      }

      return ResponseHandler.badRequest(res, result.message)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ResponseHandler.notFound(res, error.message)
      }
      if (error instanceof ValidationError) {
        return ResponseHandler.validationError(res, error.errors || [error.message])
      }
      return ResponseHandler.internalError(res, 'Failed to update employee')
    }
  }

  /**
   * Delete employee (soft delete)
   * DELETE /api/employees/:id
   */
  async deleteEmployee(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params
      const deletedBy = req.user?.id!

      const result = await this.employeeService.deleteEmployee(id, deletedBy)

      if (result.success) {
        return ResponseHandler.success(res, result.message)
      }

      return ResponseHandler.badRequest(res, result.message)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return ResponseHandler.notFound(res, error.message)
      }
      return ResponseHandler.internalError(res, 'Failed to delete employee')
    }
  }

  async sendInvitation(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params
      const invitedBy = req.user?.id!

      // Get employee details
      const employee = await this.employeeService.getEmployeeById(id)
      if (!employee) {
        return ResponseHandler.notFound(res, 'Employee not found')
      }

      if (employee.userId) {
        return ResponseHandler.conflict(res, 'Employee already has an active account')
      }

      const employeeData: CreateEmployeeData = {
        fullName: employee.fullName,
        email: employee.email,
        phoneNumber: employee.phoneNumber,
        dateOfBirth: employee.dateOfBirth,
        address: employee.address,
        emergencyContact: employee.emergencyContact,
        emergencyPhone: employee.emergencyPhone,
        departmentId: employee.departmentId,
        positionId: employee.positionId,
        managerId: employee.managerId,
        hireDate: employee.hireDate,
        salary: employee.salary,
        skills: employee.skills,
        notes: employee.notes,
        sendInvitation: true
      }

      const result = await this.employeeService.createEmployee(employeeData, invitedBy)

      if (result.success) {
        return ResponseHandler.success(res, 'Invitation sent successfully', {
          temporaryPassword: result.temporaryPassword
        })
      }

      return ResponseHandler.badRequest(res, result.message)
    } catch (error) {
      return ResponseHandler.internalError(res, 'Failed to send invitation')
    }
  }


  async getEmployeesByManager(req: Request, res: Response): Promise<Response> {
    try {
      const { managerId } = req.params
      const employees = await this.employeeService.getEmployeesByManager(managerId)

      return ResponseHandler.success(res, 'Employees retrieved successfully', { employees })
    } catch (error) {
      return ResponseHandler.internalError(res, 'Failed to retrieve employees by manager')
    }
  }

  async getEmployeesByDepartment(req: Request, res: Response): Promise<Response> {
    try {
      const { departmentId } = req.params
      const employees = await this.employeeService.getEmployeesByDepartment(departmentId)

      return ResponseHandler.success(res, 'Employees retrieved successfully', { employees })
    } catch (error) {
      return ResponseHandler.internalError(res, 'Failed to retrieve employees by department')
    }
  }

  async getOrganizationalStructure(req: Request, res: Response): Promise<Response> {
    try {
      const departmentId = req.query.departmentId as string

      const filters: EmployeeSearchFilters = {
        employmentStatus: 'active',
        departmentId: departmentId || undefined
      }

      const result = await this.employeeService.searchEmployees(filters)

      if (!result.success || !result.employees) {
        return ResponseHandler.internalError(res, 'Failed to retrieve organizational structure')
      }

      const orgStructure = this.buildOrganizationalHierarchy(result.employees)

      return ResponseHandler.success(res, 'Organizational structure retrieved successfully', {
        structure: orgStructure,
        totalEmployees: result.total
      })
    } catch (error) {
      return ResponseHandler.internalError(res, 'Failed to retrieve organizational structure')
    }
  }

  async getEmployeeStatistics(req: Request, res: Response): Promise<Response> {
    try {
      const allEmployeesResult = await this.employeeService.searchEmployees({})
      
      if (!allEmployeesResult.success || !allEmployeesResult.employees) {
        return ResponseHandler.internalError(res, 'Failed to retrieve employee statistics')
      }

      const employees = (allEmployeesResult.employees || []) as Employee[]

      const statistics = {
        total: employees.length,
        active: employees.filter((emp: Employee) => emp.employmentStatus === 'active').length,
        inactive: employees.filter((emp: Employee) => emp.employmentStatus === 'inactive').length,
        onLeave: employees.filter((emp: Employee) => emp.employmentStatus === 'on_leave').length,
        terminated: employees.filter((emp: Employee) => emp.employmentStatus === 'terminated').length,
        byDepartment: this.groupByDepartment(employees),
        byPosition: this.groupByPosition(employees),
        recentHires: employees
          .filter((emp: Employee) => {
            const hireDate = new Date(emp.hireDate)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            return hireDate >= thirtyDaysAgo
          })
          .length
      }

      return ResponseHandler.success(res, 'Employee statistics retrieved successfully', { statistics })
    } catch (error) {
      return ResponseHandler.internalError(res, 'Failed to retrieve employee statistics')
    }
  }

  private buildOrganizationalHierarchy(employees: Employee[]): any[] {
    const employeeMap = new Map()
    const rootEmployees: any[] = []

    employees.forEach((emp: Employee) => {
      employeeMap.set(emp.id, {
        ...emp,
        subordinates: []
      })
    })

    employees.forEach((emp: Employee) => {
      if (emp.managerId && employeeMap.has(emp.managerId)) {
        const manager = employeeMap.get(emp.managerId)
        manager.subordinates.push(employeeMap.get(emp.id))
      } else {
        rootEmployees.push(employeeMap.get(emp.id))
      }
    })

    return rootEmployees
  }

  
  private groupByDepartment(employees: Employee[]): Record<string, number> {
    const departmentCounts: Record<string, number> = {}

    employees.forEach((emp: Employee) => {
      const deptId = emp.departmentId || 'unassigned'
      departmentCounts[deptId] = (departmentCounts[deptId] || 0) + 1
    })

    return departmentCounts
  }

  private groupByPosition(employees: Employee[]): Record<string, number> {
    const positionCounts: Record<string, number> = {}

    employees.forEach((emp: Employee) => {
      const posId = emp.positionId || 'unassigned'
      positionCounts[posId] = (positionCounts[posId] || 0) + 1
    })

    return positionCounts
  }
}