import { supabase } from '../config/database'
import { hashPassword } from '../utils/password'
import { RoleService } from './role.service'
import { ConflictError, ValidationError, AppError } from '../utils/errors'

export interface SystemInitResult {
    superAdminCreated: boolean
    superAdminCredentials?: {
        email: string
        password: string
    }
}

export interface SystemStatus {
    needsInitialization: boolean
    totalUsers: number
    roleDistribution: Record<string, number>
    systemReady: boolean
}

export class SystemService {
    private roleService: RoleService

    constructor() {
        this.roleService = new RoleService()
    }

    /**
     * Initialize the system with a super admin account
     * This should be called only once during system setup
     */
    async initializeSystem(): Promise<SystemInitResult> {
        // Check if super admin already exists
        const { data: existingSuperAdmin } = await supabase
            .from('users')
            .select(`
                id,
                user_roles!inner(role_name, is_active)
            `)
            .eq('user_roles.role_name', 'super-admin')
            .eq('user_roles.is_active', true)
            .single()

        if (existingSuperAdmin) {
            throw new ConflictError('System already initialized with super admin')
        }

        // Generate super admin credentials
        const superAdminEmail = 'admin@go3net.com'
        const superAdminPassword = this.generateSecurePassword()
        const hashedPassword = await hashPassword(superAdminPassword)

        // Create super admin user
        const { data: superAdminUser, error: userError } = await supabase
            .from('users')
            .insert({
                email: superAdminEmail,
                full_name: 'System Administrator',
                password_hash: hashedPassword,
                employee_id: 'ADMIN001',
                hire_date: new Date().toISOString().split('T')[0],
                account_status: 'active',
                status: 'active'
            })
            .select()
            .single()

        if (userError) {
            throw new AppError(`Failed to create super admin user: ${userError.message}`)
        }

        // Assign super admin role
        const roleResult = await this.roleService.assignRole(
            superAdminUser.id,
            'super-admin',
            superAdminUser.id // Self-assigned for initial setup
        )

        if (!roleResult.success) {
            throw new AppError(`Failed to assign super admin role: ${roleResult.message}`)
        }

        console.log('🚀 SYSTEM INITIALIZED SUCCESSFULLY')
        console.log('📧 Super Admin Email:', superAdminEmail)
        console.log('🔑 Super Admin Password:', superAdminPassword)
        console.log('⚠️  IMPORTANT: Save these credentials securely and change the password after first login!')

        return {
            superAdminCreated: true,
            superAdminCredentials: {
                email: superAdminEmail,
                password: superAdminPassword
            }
        }
    }

    /**
     * Check if system needs initialization
     */
    async needsInitialization(): Promise<boolean> {
        const { data: superAdmin } = await supabase
            .from('users')
            .select(`
                id,
                user_roles!inner(role_name, is_active)
            `)
            .eq('user_roles.role_name', 'super-admin')
            .eq('user_roles.is_active', true)
            .single()

        return !superAdmin
    }

    /**
     * Create first HR admin account (can only be done by super admin)
     */
    async createFirstHRAdmin(
        adminData: {
            email: string
            fullName: string
            password: string
        },
        createdBy: string
    ): Promise<void> {
        // Verify creator is super admin
        const creatorRole = await this.roleService.getActiveRole(createdBy)
        if (!creatorRole || creatorRole.roleName !== 'super-admin') {
            throw new ValidationError('Only super admin can create the first HR admin')
        }

        const hashedPassword = await hashPassword(adminData.password)
        const employeeId = `HR${Date.now()}`

        // Create HR admin user
        const { data: hrAdminUser, error: userError } = await supabase
            .from('users')
            .insert({
                email: adminData.email,
                full_name: adminData.fullName,
                password_hash: hashedPassword,
                employee_id: employeeId,
                hire_date: new Date().toISOString().split('T')[0],
                account_status: 'active',
                status: 'active',
                created_by: createdBy
            })
            .select()
            .single()

        if (userError) {
            throw new AppError(`Failed to create HR admin user: ${userError.message}`)
        }

        // Assign HR admin role
        const roleResult = await this.roleService.assignRole(
            hrAdminUser.id,
            'hr-admin',
            createdBy
        )

        if (!roleResult.success) {
            throw new AppError(`Failed to assign HR admin role: ${roleResult.message}`)
        }
    }

    /**
     * Get system status
     */
    async getSystemStatus(): Promise<SystemStatus> {
        const needsInit = await this.needsInitialization()

        const { data: userCounts, error } = await supabase
            .from('user_roles')
            .select(`
                role_name,
                users!inner(id)
            `)
            .eq('is_active', true)

        if (error) {
            throw new AppError(`Failed to get system status: ${error.message}`)
        }

        const roleCounts = userCounts?.reduce((acc, userRole: any) => {
            const role = userRole.role_name
            if (role) {
                acc[role] = (acc[role] || 0) + 1
            }
            return acc
        }, {} as Record<string, number>) || {}

        return {
            needsInitialization: needsInit,
            totalUsers: userCounts?.length || 0,
            roleDistribution: roleCounts,
            systemReady: !needsInit
        }
    }

    private generateSecurePassword(): string {
        const length = 16
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
        let password = ''

        // Ensure at least one of each type
        password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
        password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
        password += '0123456789'[Math.floor(Math.random() * 10)]
        password += '!@#$%^&*'[Math.floor(Math.random() * 8)]

        // Fill the rest randomly
        for (let i = password.length; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)]
        }

        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('')
    }
}