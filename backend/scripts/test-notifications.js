const axios = require('axios')

const BASE_URL = 'http://localhost:5000/api'

async function testNotificationSystem() {
  try {
    console.log('🧪 Testing Push Notification System...\n')
    
    // Test 1: Get VAPID public key
    console.log('1. Testing VAPID public key endpoint...')
    const vapidResponse = await axios.get(`${BASE_URL}/notifications/vapid-public-key`)
    console.log('✅ VAPID public key:', vapidResponse.data.data.publicKey.substring(0, 20) + '...')
    
    // Test 2: Check if server is responding
    console.log('\n2. Testing server health...')
    const healthResponse = await axios.get('http://localhost:5000/health')
    console.log('✅ Server status:', healthResponse.data.status)
    
    console.log('\n🎉 Basic notification system tests passed!')
    console.log('\n📋 Next steps:')
    console.log('1. Run the database setup script (manually execute the SQL)')
    console.log('2. Start your frontend application')
    console.log('3. Login and test notification subscription')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    if (error.response) {
      console.error('Response:', error.response.data)
    }
  }
}

testNotificationSystem()