import { supabase } from '../config/database'
import { EmailService } from './email.service'
import { RoleService } from './role.service'
import { generateTemporaryPassword } from '../utils/password'
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors'

export interface Employee {
  id: string
  userId?: string
  employeeId: string
  fullName: string
  email: string
  phoneNumber?: string
  dateOfBirth?: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
  departmentId?: string
  positionId?: string
  managerId?: string
  hireDate: string
  salary?: number
  employmentStatus: 'active' | 'inactive' | 'terminated' | 'on_leave'
  profilePicture?: string
  skills?: string[]
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy?: string
}

export interface CreateEmployeeData {
  fullName: string
  email: string
  phoneNumber?: string
  dateOfBirth?: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
  departmentId?: string
  positionId?: string
  managerId?: string
  hireDate: string
  salary?: number
  skills?: string[]
  notes?: string
  sendInvitation?: boolean
}

export interface UpdateEmployeeData {
  fullName?: string
  phoneNumber?: string
  dateOfBirth?: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
  departmentId?: string
  positionId?: string
  managerId?: string
  salary?: number
  employmentStatus?: 'active' | 'inactive' | 'terminated' | 'on_leave'
  profilePicture?: string
  skills?: string[]
  notes?: string
}

export interface EmployeeSearchFilters {
  departmentId?: string
  positionId?: string
  managerId?: string
  employmentStatus?: string
  search?: string
  limit?: number
  offset?: number
}

export interface EmployeeResult {
  success: boolean
  message: string
  employee?: Employee
  employees?: Employee[]
  total?: number
  temporaryPassword?: string
}

export class EmployeeService {
  private emailService: EmailService
  private roleService: RoleService

  constructor() {
    this.emailService = new EmailService()
    this.roleService = new RoleService()
  }

  async createEmployee(data: CreateEmployeeData, createdBy: string): Promise<EmployeeResult> {
    try {
      // Validate required fields
      this.validateEmployeeData(data)

      // Check if email already exists
      const existingEmployee = await this.getEmployeeByEmail(data.email)
      if (existingEmployee) {
        throw new ConflictError('Employee with this email already exists')
      }

      // Generate employee ID
      const employeeId = await this.generateEmployeeId()

      // Create employee record
      const { data: newEmployee, error } = await supabase
        .from('employees')
        .insert({
          employee_id: employeeId,
          full_name: data.fullName,
          email: data.email,
          phone_number: data.phoneNumber,
          date_of_birth: data.dateOfBirth,
          address: data.address,
          emergency_contact: data.emergencyContact,
          emergency_phone: data.emergencyPhone,
          department_id: data.departmentId,
          position_id: data.positionId,
          manager_id: data.managerId,
          hire_date: data.hireDate,
          salary: data.salary,
          employment_status: 'active',
          skills: data.skills || [],
          notes: data.notes,
          created_by: createdBy
        })
        .select()
        .single()

      if (error) throw error

      const employee = this.mapDatabaseToEmployee(newEmployee)

      // Send invitation if requested
      let temporaryPassword: string | undefined
      if (data.sendInvitation) {
        temporaryPassword = await this.sendEmployeeInvitation(employee, createdBy)
      }

      return {
        success: true,
        message: 'Employee created successfully',
        employee,
        temporaryPassword
      }
    } catch (error) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error
      }
      throw new Error('Failed to create employee')
    }
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          department:departments(id, name),
          position:positions(id, title),
          manager:employees!manager_id(id, full_name, employee_id)
        `)
        .eq('id', id)
        .single()

      if (error || !data) return null

      return this.mapDatabaseToEmployee(data)
    } catch (error) {
      return null
    }
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | null> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          department:departments(id, name),
          position:positions(id, title),
          manager:employees!manager_id(id, full_name, employee_id)
        `)
        .eq('employee_id', employeeId)
        .single()

      if (error || !data) return null

      return this.mapDatabaseToEmployee(data)
    } catch (error) {
      return null
    }
  }

  async getEmployeeByEmail(email: string): Promise<Employee | null> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          department:departments(id, name),
          position:positions(id, title),
          manager:employees!manager_id(id, full_name, employee_id)
        `)
        .eq('email', email)
        .single()

      if (error || !data) return null

      return this.mapDatabaseToEmployee(data)
    } catch (error) {
      return null
    }
  }

  async updateEmployee(id: string, data: UpdateEmployeeData, updatedBy: string): Promise<EmployeeResult> {
    try {
      // Check if employee exists
      const existingEmployee = await this.getEmployeeById(id)
      if (!existingEmployee) {
        throw new NotFoundError('Employee not found')
      }

      // Update employee record
      const { data: updatedEmployee, error } = await supabase
        .from('employees')
        .update({
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          date_of_birth: data.dateOfBirth,
          address: data.address,
          emergency_contact: data.emergencyContact,
          emergency_phone: data.emergencyPhone,
          department_id: data.departmentId,
          position_id: data.positionId,
          manager_id: data.managerId,
          salary: data.salary,
          employment_status: data.employmentStatus,
          profile_picture: data.profilePicture,
          skills: data.skills,
          notes: data.notes,
          updated_by: updatedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          department:departments(id, name),
          position:positions(id, title),
          manager:employees!manager_id(id, full_name, employee_id)
        `)
        .single()

      if (error) throw error

      const employee = this.mapDatabaseToEmployee(updatedEmployee)

      return {
        success: true,
        message: 'Employee updated successfully',
        employee
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new Error('Failed to update employee')
    }
  }

  async deleteEmployee(id: string, deletedBy: string): Promise<EmployeeResult> {
    try {
      // Check if employee exists
      const existingEmployee = await this.getEmployeeById(id)
      if (!existingEmployee) {
        throw new NotFoundError('Employee not found')
      }

      // Soft delete by updating employment status
      const { error } = await supabase
        .from('employees')
        .update({
          employment_status: 'terminated',
          updated_by: deletedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      return {
        success: true,
        message: 'Employee deleted successfully'
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new Error('Failed to delete employee')
    }
  }

  async searchEmployees(filters: EmployeeSearchFilters): Promise<EmployeeResult> {
    try {
      const _ts = new Date().toISOString()
      try {
        console.log(`[EMPLOYEES][${_ts}] searchEmployees called with filters:`, JSON.stringify(filters))
      } catch {}

      let query = supabase
        .from('employees')
        .select(`
          *,
          department:departments(id, name),
          position:positions(id, title),
          manager:employees!manager_id(id, full_name, employee_id)
        `, { count: 'exact' })

      // Apply filters
      if (filters.departmentId) {
        query = query.eq('department_id', filters.departmentId)
      }

      if (filters.positionId) {
        query = query.eq('position_id', filters.positionId)
      }

      if (filters.managerId) {
        query = query.eq('manager_id', filters.managerId)
      }

      if (filters.employmentStatus) {
        query = query.eq('employment_status', filters.employmentStatus)
      }

      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,employee_id.ilike.%${filters.search}%`)
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      try {
        console.log(`[EMPLOYEES][${_ts}] pagination -> limit=${filters.limit ?? 'none'} offset=${filters.offset ?? 'none'}`)
      } catch {}

      const { data, error, count } = await query

      if (error) {
        try {
          console.error(`[EMPLOYEES][${_ts}] Supabase error in searchEmployees`, {
            message: (error as any).message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: (error as any).code
          })
        } catch {}
        throw error
      }

      const employees = data?.map(emp => this.mapDatabaseToEmployee(emp)) || []

      try {
        console.log(`[EMPLOYEES][${_ts}] searchEmployees success -> rows=${employees.length} total=${count ?? 0}`)
      } catch {}

      return {
        success: true,
        message: 'Employees retrieved successfully',
        employees,
        total: count || 0
      }
    } catch (error: any) {
      try {
        console.error(`[EMPLOYEES][${new Date().toISOString()}] searchEmployees FAILED`, {
          filters,
          error: {
            message: error?.message,
            stack: error?.stack,
            code: error?.code,
            details: error?.details,
            hint: error?.hint
          }
        })
      } catch {}
      throw new Error('Failed to search employees')
    }
  }

  async getEmployeesByManager(managerId: string): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          department:departments(id, name),
          position:positions(id, title)
        `)
        .eq('manager_id', managerId)
        .eq('employment_status', 'active')

      if (error) throw error

      return data?.map(emp => this.mapDatabaseToEmployee(emp)) || []
    } catch (error) {
      return []
    }
  }

  async getEmployeesByDepartment(departmentId: string): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          position:positions(id, title),
          manager:employees!manager_id(id, full_name, employee_id)
        `)
        .eq('department_id', departmentId)
        .eq('employment_status', 'active')

      if (error) throw error

      return data?.map(emp => this.mapDatabaseToEmployee(emp)) || []
    } catch (error) {
      return []
    }
  }

  private async sendEmployeeInvitation(employee: Employee, invitedBy: string): Promise<string> {
    try {
      // Generate temporary password
      const temporaryPassword = generateTemporaryPassword()

      // Create user account for the employee
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          email: employee.email,
          full_name: employee.fullName,
          employee_id: employee.employeeId,
          password_hash: temporaryPassword, // This should be hashed in a real implementation
          is_temporary_password: true,
          account_status: 'pending_setup'
        })
        .select()
        .single()

      if (error) throw error

      // Link employee to user
      await supabase
        .from('employees')
        .update({ user_id: newUser.id })
        .eq('id', employee.id)

      // Assign default employee role
      await this.roleService.assignDefaultRole(newUser.id)

      // Send invitation email
      await this.emailService.sendEmployeeInvitationEmail(
        employee.email,
        employee.fullName,
        temporaryPassword
      )

      return temporaryPassword
    } catch (error) {
      throw new Error('Failed to send employee invitation')
    }
  }

  private async generateEmployeeId(): Promise<string> {
    const prefix = 'EMP'
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `${prefix}${timestamp}${random}`
  }

  private validateEmployeeData(data: CreateEmployeeData): void {
    const errors: string[] = []

    if (!data.fullName?.trim()) {
      errors.push('Full name is required')
    }

    if (!data.email?.trim()) {
      errors.push('Email is required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format')
    }

    if (!data.hireDate) {
      errors.push('Hire date is required')
    }

    if (data.salary && data.salary < 0) {
      errors.push('Salary must be a positive number')
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors)
    }
  }

  private mapDatabaseToEmployee(data: any): Employee {
    return {
      id: data.id,
      userId: data.user_id,
      employeeId: data.employee_id,
      fullName: data.full_name,
      email: data.email,
      phoneNumber: data.phone_number,
      dateOfBirth: data.date_of_birth,
      address: data.address,
      emergencyContact: data.emergency_contact,
      emergencyPhone: data.emergency_phone,
      departmentId: data.department_id,
      positionId: data.position_id,
      managerId: data.manager_id,
      hireDate: data.hire_date,
      salary: data.salary,
      employmentStatus: data.employment_status,
      profilePicture: data.profile_picture,
      skills: data.skills || [],
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      updatedBy: data.updated_by
    }
  }
}