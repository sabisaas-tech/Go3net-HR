#!/usr/bin/env ts-node

import dotenv from 'dotenv'
import { SystemService } from '../src/services/system.service'

// Load environment variables
dotenv.config()

async function initializeSystem() {
  console.log('🚀 Initializing Go3net HR Management System...\n')
  
  const systemService = new SystemService()
  
  try {
    // Check if system needs initialization
    const needsInit = await systemService.needsInitialization()
    
    if (!needsInit) {
      console.log('✅ System is already initialized!')
      console.log('ℹ️  Super admin account already exists.')
      return
    }
    
    console.log('📋 System needs initialization...')
    console.log('🔧 Creating super admin account...\n')
    
    // Initialize system
    const result = await systemService.initializeSystem()
    
    if (result.success && result.superAdminCreated && result.superAdminCredentials) {
      console.log('\n🎉 SYSTEM INITIALIZATION SUCCESSFUL!\n')
      console.log('=' .repeat(50))
      console.log('📧 Super Admin Email:', result.superAdminCredentials.email)
      console.log('🔑 Super Admin Password:', result.superAdminCredentials.password)
      console.log('=' .repeat(50))
      console.log('\n⚠️  IMPORTANT SECURITY NOTES:')
      console.log('   1. Save these credentials in a secure location')
      console.log('   2. Change the password after first login')
      console.log('   3. Do not share these credentials')
      console.log('   4. Use this account to create other admin accounts')
      console.log('\n🌐 You can now start the application and log in!')
      console.log('   Frontend: http://localhost:3000')
      console.log('   Backend: http://localhost:5000')
    } else {
      console.error('❌ System initialization failed:', result.message)
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Error during system initialization:', error)
    process.exit(1)
  }
}

// Run the initialization
initializeSystem()
  .then(() => {
    console.log('\n✨ Initialization complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })