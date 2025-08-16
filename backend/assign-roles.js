const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function assignRoles() {
  console.log('🔧 Assigning roles to users...');
  
  // Get all users without roles
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, full_name');
  
  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    return;
  }
  
  console.log(`📊 Found ${users.length} users`);
  
  for (const user of users) {
    console.log(`\n👤 Processing user: ${user.email}`);
    
    // Check if user already has roles
    const { data: existingRoles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id);
    
    if (existingRoles && existingRoles.length > 0) {
      console.log(`✅ User ${user.email} already has ${existingRoles.length} role(s)`);
      continue;
    }
    
    // Determine role based on email
    let roleName = 'employee';
    if (user.email === 'admin@go3net.com') {
      roleName = 'super-admin';
    }
    
    // Get role permissions
    const rolePermissions = {
      'super-admin': ['*'],
      'employee': ['profile.read', 'profile.update', 'tasks.read', 'tasks.update']
    };
    
    // Assign role
    const { data: newRole, error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role_name: roleName,
        permissions: rolePermissions[roleName],
        assigned_by: user.id, // Self-assigned for now
        is_active: true
      })
      .select();
    
    if (roleError) {
      console.error(`❌ Error assigning role to ${user.email}:`, roleError);
    } else {
      console.log(`✅ Assigned ${roleName} role to ${user.email}`);
    }
  }
  
  console.log('\n🎉 Role assignment complete!');
  process.exit(0);
}

assignRoles().catch(console.error);