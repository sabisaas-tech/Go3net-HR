const fetch = require('node-fetch');

async function testLogin() {
  const baseUrl = 'http://localhost:5000'; // Adjust if your server runs on different port
  
  console.log('🧪 Testing Login API');
  console.log('==================');
  
  // Test data
  const testCases = [
    {
      name: 'Admin Account',
      email: 'admin@go3net.com',
      password: 'Admin123!'
    },
    {
      name: 'User Account',
      email: 'passioncaleb5@gmail.com',
      password: 'TestPass123!'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Testing ${testCase.name}:`);
    console.log(`📧 Email: ${testCase.email}`);
    console.log(`🔑 Password: ${testCase.password}`);
    
    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testCase.email,
          password: testCase.password
        })
      });
      
      const responseText = await response.text();
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      console.log(`📄 Response Headers:`, Object.fromEntries(response.headers.entries()));
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log(`✅ Response Body:`, JSON.stringify(responseData, null, 2));
      } catch (e) {
        console.log(`❌ Raw Response:`, responseText);
      }
      
      if (response.ok) {
        console.log(`✅ ${testCase.name} login SUCCESS!`);
      } else {
        console.log(`❌ ${testCase.name} login FAILED!`);
      }
      
    } catch (error) {
      console.log(`💥 Network Error for ${testCase.name}:`, error.message);
    }
  }
  
  console.log('\n🔍 Testing Debug Endpoint:');
  try {
    const response = await fetch(`${baseUrl}/api/debug/check-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@go3net.com',
        password: 'Admin123!'
      })
    });
    
    const responseData = await response.json();
    console.log(`📊 Debug Response:`, JSON.stringify(responseData, null, 2));
    
  } catch (error) {
    console.log(`💥 Debug endpoint error:`, error.message);
  }
}

testLogin().catch(console.error);