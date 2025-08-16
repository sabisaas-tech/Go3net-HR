import { supabase } from '../config/database'

export async function debugDatabaseConstraints() {
  try {
    console.log('🔍 Checking database constraints...')
    
    // Simple query to test database connection
    const { data: testQuery, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (testError) {
      console.error('❌ Database connection test failed:', testError)
      return
    }

    console.log('✅ Database connection successful')

    // Try a simple raw SQL query to check constraints
    const { data: rawQuery, error: rawError } = await supabase
      .rpc('exec_sql', { 
        query: `
          SELECT constraint_name, check_clause 
          FROM information_schema.check_constraints 
          WHERE constraint_name LIKE '%users%account_status%'
        `
      })

    if (rawError) {
      console.log('⚠️ Could not fetch constraint info via RPC (this is normal for some setups)')
      console.log('Raw error:', rawError)
    } else {
      console.log('📋 Constraint info:', rawQuery)
    }

  } catch (error) {
    console.error('Database debug error:', error)
  }
}

export async function testConstraintValues() {
  try {
    console.log('🧪 Testing constraint values...')
    
    // Test valid account_status values
    const testValues = ['pending_setup', 'active', 'suspended']
    
    for (const value of testValues) {
      try {
        // Try to insert a test record (we'll delete it immediately)
        const testData = {
          email: `test-${Date.now()}@example.com`,
          full_name: 'Test User',
          password_hash: 'test_hash',
          employee_id: `TEST${Date.now()}`,
          hire_date: new Date().toISOString().split('T')[0],
          account_status: value,
          status: 'inactive'
        }

        const { data, error } = await supabase
          .from('users')
          .insert(testData)
          .select('id')
          .single()

        if (error) {
          console.error(`❌ Failed to insert with account_status '${value}':`, error.message)
        } else {
          console.log(`✅ Successfully inserted with account_status '${value}'`)
          
          // Clean up test record
          await supabase.from('users').delete().eq('id', data.id)
        }
      } catch (err) {
        console.error(`❌ Exception testing account_status '${value}':`, err)
      }
    }
  } catch (error) {
    console.error('Constraint test error:', error)
  }
}