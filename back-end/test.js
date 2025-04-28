// backend/test.js
async function testBackend() {
  const tests = [
    // Test 1: Basic endpoint
    {
      name: 'Test endpoint',
      url: 'http://localhost:3000/api/test',
      method: 'GET'
    },
    // Test 2: Verify valid username
    {
      name: 'Verify valid username',
      url: 'http://localhost:3000/api/verify-leetcode-user',
      method: 'POST',
      body: { username: 'johnkim05' }
    },
    // Test 3: Verify invalid username
    {
      name: 'Verify invalid username',
      url: 'http://localhost:3000/api/verify-leetcode-user',
      method: 'POST',
      body: { username: 'thisusershouldnotexist123456789' }
    }
  ];

  for (const test of tests) {
    console.log(`\nRunning: ${test.name}`);
    try {
      const response = await fetch(test.url, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: test.body ? JSON.stringify(test.body) : undefined
      });
      const data = await response.json();
      console.log('Status:', response.status);
      console.log('Response:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

testBackend();
