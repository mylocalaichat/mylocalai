// Simple test script for MCP API endpoints
const baseUrl = 'http://localhost:3002'

async function testEndpoints() {
  console.log('Testing MCP Server endpoints...\n')

  // Test health endpoint
  try {
    const healthResponse = await fetch(`${baseUrl}/health`)
    const healthData = await healthResponse.json()
    console.log('✅ Health endpoint:', healthData)
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message)
  }

  // Test tools endpoint
  try {
    const toolsResponse = await fetch(`${baseUrl}/api/tools`)
    const toolsData = await toolsResponse.json()
    console.log('✅ Tools endpoint:', toolsData)
  } catch (error) {
    console.log('❌ Tools endpoint failed:', error.message)
  }

  // Test MCP courseReminder tool
  try {
    const mcpResponse = await fetch(`${baseUrl}/api/mcp/stdio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'courseReminder',
        params: {
          experienceLevel: 'beginner'
        }
      })
    })
    const mcpData = await mcpResponse.json()
    console.log('✅ MCP courseReminder:', mcpData)
  } catch (error) {
    console.log('❌ MCP courseReminder failed:', error.message)
  }

  console.log('\nTest completed!')
}

// Run if this is the main module
if (require.main === module) {
  testEndpoints()
}

module.exports = { testEndpoints }