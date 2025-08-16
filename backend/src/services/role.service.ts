import { supabase } from '../config/database'

export interface Permission {
  resource: string
  action: string
  scope: string
  conditions?: Record<string, any>
}

export interface Role {
  id: string
  userId: string
  roleName: string
  permissions: string[]
  assignedBy?: string
  assignedAt: string
  isActive: boolean
}

export interface RoleAssignmentResult {
  success: boolean
  message: string
  role?: Role
}

export class RoleService {
  private readonly roleHierarchy = {
    'super-admin': {
      level: 5,
      permissions: ['*'],
      description: 'System administrator with full access'
    },
    'hr-admin': {
      level: 4,
      permissions: [
        'employee.create', 'employee.read', 'employee.update', 'employee.delete',
        'recruitment.manage', 'payroll.manage', 'reports.generate',
        'roles.assign', 'roles.manage'
      ],
      description: 'HR administrator with full HR management access'
    },
    'manager': {
      level: 3,
      permissions: [
        'employee.read', 'team.manage', 'performance.manage',
        'leave.approve', 'time.review', 'tasks.create',
        'tasks.assign', 'checkin.review'
      ],
      description: 'Department/team manager'
    },
    'hr-staff': {
      level: 2,
      permissions: [
        'employee.read', 'recruitment.read', 'recruitment.update',
        'onboarding.manage', 'documents.manage'
      ],
      description: 'HR staff member'
    },
    'employee': {
      level: 1,
      permissions: [
        'profile.read', 'profile.update', 'leave.request',
        'time.log', 'documents.view', 'checkin.create',
        'tasks.read', 'tasks.update'
      ],
      description: 'Regular employee'
    }
  }

  async assignDefaultRole(userId: string): Promise<RoleAssignmentResult> {
    try {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (existingRole) {
        return {
          success: true,
          message: 'User already has an active role',
          role: existingRole
        }
      }

      const { data: newRole, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_name: 'employee',
          permissions: this.roleHierarchy.employee.permissions,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        message: 'Default employee role assigned successfully',
        role: newRole
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to assign default role'
      }
    }
  }

  async assignRole(userId: string, roleName: string, assignedBy: string): Promise<RoleAssignmentResult> {
    try {
      if (!this.roleHierarchy[roleName as keyof typeof this.roleHierarchy]) {
        return {
          success: false,
          message: 'Invalid role name'
        }
      }

      const canAssign = await this.canAssignRole(assignedBy, roleName)
      if (!canAssign) {
        return {
          success: false,
          message: 'Insufficient permissions to assign this role'
        }
      }

      await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true)

      const roleConfig = this.roleHierarchy[roleName as keyof typeof this.roleHierarchy]
      const { data: newRole, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_name: roleName,
          permissions: roleConfig.permissions,
          assigned_by: assignedBy,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        message: `Role ${roleName} assigned successfully`,
        role: newRole
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to assign role'
      }
    }
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) throw error
      if (!roles) return []

      return roles.map((r: any) => {
        const basePerms = r.permissions as string[] | null | undefined
        const perms = basePerms && basePerms.length > 0
          ? basePerms
          : (this.roleHierarchy[r.role_name as keyof typeof this.roleHierarchy]?.permissions || [])
        return {
          id: r.id,
          userId: r.user_id,
          roleName: r.role_name,
          permissions: perms,
          assignedBy: r.assigned_by,
          assignedAt: r.assigned_at,
          isActive: r.is_active,
        }
      })
    } catch (error) {
      return []
    }
  }

  async getActiveRole(userId: string): Promise<Role | null> {
    try {
      const { data: role, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (error || !role) return null
      const basePerms = role.permissions as string[] | null | undefined
      const perms = basePerms && basePerms.length > 0
        ? basePerms
        : (this.roleHierarchy[role.role_name as keyof typeof this.roleHierarchy]?.permissions || [])
      return {
        id: role.id,
        userId: role.user_id,
        roleName: role.role_name,
        permissions: perms,
        assignedBy: role.assigned_by,
        assignedAt: role.assigned_at,
        isActive: role.is_active,
      }
    } catch (error) {
      return null
    }
  }

  async validatePermission(userId: string, permission: string): Promise<boolean> {
    try {
      const role = await this.getActiveRole(userId)
      if (!role) return false

      if (role.permissions.includes('*')) return true

      return role.permissions.includes(permission)
    } catch (error) {
      return false
    }
  }

  async validateResourceAccess(userId: string, resource: string, action: string, scope: string = 'own'): Promise<boolean> {
    try {
      const role = await this.getActiveRole(userId)
      if (!role) return false

      if (role.permissions.includes('*')) return true

      const permissionString = `${resource}.${action}`
      const scopedPermissionString = `${resource}.${action}.${scope}`

      return role.permissions.includes(permissionString) || 
             role.permissions.includes(scopedPermissionString)
    } catch (error) {
      return false
    }
  }

  async canAssignRole(assignerId: string, targetRole: string): Promise<boolean> {
    try {
      // Allow self-assignment for super-admin during initial setup
      if (targetRole === 'super-admin') {
        return true
      }

      const assignerRole = await this.getActiveRole(assignerId)
      if (!assignerRole) return false

      if (assignerRole.permissions.includes('*')) return true

      if (!assignerRole.permissions.includes('roles.assign')) return false

      const assignerLevel = this.roleHierarchy[assignerRole.roleName as keyof typeof this.roleHierarchy]?.level || 0
      const targetLevel = this.roleHierarchy[targetRole as keyof typeof this.roleHierarchy]?.level || 0

      return assignerLevel > targetLevel
    } catch (error) {
      return false
    }
  }

  async updateUserPermissions(userId: string, permissions: string[], updatedBy: string): Promise<RoleAssignmentResult> {
    try {
      const canUpdate = await this.validatePermission(updatedBy, 'roles.manage')
      if (!canUpdate) {
        return {
          success: false,
          message: 'Insufficient permissions to update user permissions'
        }
      }

      const { data: updatedRole, error } = await supabase
        .from('user_roles')
        .update({ permissions })
        .eq('user_id', userId)
        .eq('is_active', true)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        message: 'User permissions updated successfully',
        role: updatedRole
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update user permissions'
      }
    }
  }

  async deactivateRole(userId: string, deactivatedBy: string): Promise<RoleAssignmentResult> {
    try {
      const canDeactivate = await this.validatePermission(deactivatedBy, 'roles.manage')
      if (!canDeactivate) {
        return {
          success: false,
          message: 'Insufficient permissions to deactivate role'
        }
      }

      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) throw error

      return {
        success: true,
        message: 'User role deactivated successfully'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to deactivate role'
      }
    }
  }

  getRoleHierarchy() {
    return this.roleHierarchy
  }

  getAvailableRoles(): string[] {
    return Object.keys(this.roleHierarchy)
  }

  getRolePermissions(roleName: string): string[] {
    const role = this.roleHierarchy[roleName as keyof typeof this.roleHierarchy]
    return role ? role.permissions : []
  }

  getRoleLevel(roleName: string): number {
    const role = this.roleHierarchy[roleName as keyof typeof this.roleHierarchy]
    return role ? role.level : 0
  }
}