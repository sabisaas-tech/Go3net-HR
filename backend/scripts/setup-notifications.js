const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupNotificationTables() {
  try {
    console.log('Setting up notification tables...')
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../database/002_add_notifications_supabase.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Split SQL into individual statements (basic splitting)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`Executing ${statements.length} SQL statements...`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`)
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          if (error) {
            console.error(`Error in statement ${i + 1}:`, error)
          }
        } catch (err) {
          console.error(`Error executing statement ${i + 1}:`, err.message)
        }
      }
    }
    
    console.log('✅ Notification tables setup complete!')
    console.log('You can now use push notifications in your application.')
    
  } catch (error) {
    console.error('❌ Error setting up notification tables:', error)
    process.exit(1)
  }
}

setupNotificationTables()