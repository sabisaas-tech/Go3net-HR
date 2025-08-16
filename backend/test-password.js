const bcrypt = require('bcryptjs');

// Test password hashing and comparison
async function testPassword() {
  const plainPassword = 'your_password_here'; // Replace with your actual password
  const hashedFromDB = '$2a$12$kbCpmxYbe7ei7UM.NPcp4OYPZvHNygSCSVvcUG5ZLvKIGEs1uZqCK'; // Your hash from DB
  
  console.log('Testing password comparison...');
  console.log('Plain password:', plainPassword);
  console.log('Hash from DB:', hashedFromDB);
  
  const result = await bcrypt.compare(plainPassword, hashedFromDB);
  console.log('Comparison result:', result);
  
  // Also test creating a new hash
  const newHash = await bcrypt.hash(plainPassword, 12);
  console.log('New hash:', newHash);
  
  const newResult = await bcrypt.compare(plainPassword, newHash);
  console.log('New hash comparison:', newResult);
}

testPassword().catch(console.error);