const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetAdminPassword() {
  const newPassword = 'Admin123!'; // Simple password for testing
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  console.log('🔄 Resetting admin password...');
  
  // Update admin password
  const { data, error } = await supabase
    .from('users')
    .update({ 
      password_hash: hashedPassword,
      last_password_change: new Date().toISOString()
    })
    .eq('email', 'admin@go3net.com')
    .select();
  
  if (error) {
    console.error('❌ Error updating admin password:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('✅ Admin password updated successfully!');
    console.log('📧 Email: admin@go3net.com');
    console.log('🔑 Password: Admin123!');
    console.log('');
    console.log('You can now login with these credentials.');
  } else {
    console.log('❌ Admin user not found');
  }
}

async function resetUserPassword() {
  const email = 'passioncaleb5@gmail.com'; // Your email
  const newPassword = 'TestPass123!'; // Simple password for testing
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  console.log('🔄 Resetting user password...');
  
  // Update user password
  const { data, error } = await supabase
    .from('users')
    .update({ 
      password_hash: hashedPassword,
      last_password_change: new Date().toISOString(),
      account_status: 'active',
      status: 'active'
    })
    .eq('email', email)
    .select();
  
  if (error) {
    console.error('❌ Error updating user password:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('✅ User password updated successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password: TestPass123!');
    console.log('');
    console.log('You can now login with these credentials.');
  } else {
    console.log('❌ User not found');
  }
}

async function main() {
  console.log('🚀 Password Reset Utility');
  console.log('========================');
  
  await resetAdminPassword();
  console.log('');
  await resetUserPassword();
  
  process.exit(0);
}

main().catch(console.error);