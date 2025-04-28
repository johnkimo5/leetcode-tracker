document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const username = localStorage.getItem('username');
    if (username) {
      window.location.href = 'pages/profile.html';
    }
  
    // Handle login button click
    document.getElementById('loginButton').addEventListener('click', async function() {
      const username = document.getElementById('loginUsername').value.trim();
      const errorElement = document.getElementById('loginError');
      
      if (!username) {
        errorElement.textContent = 'Please enter a username';
        errorElement.style.display = 'block';
        return;
      }
  
      try {
        // Verify if the username exists on LeetCode
        const isValid = await verifyLeetCodeUsername(username);
        
        if (isValid) {
          // Save login state and username
          localStorage.setItem('username', username);
          window.location.href = 'pages/profile.html';
        } else {
          errorElement.textContent = 'Username not found on LeetCode';
          errorElement.style.display = 'block';
        }
      } catch (error) {
        errorElement.textContent = 'Error verifying username. Please try again.';
        errorElement.style.display = 'block';
        console.error('Login error:', error);
      }
    });
  });
  
  async function verifyLeetCodeUsername(username) {
    try {
      const response = await fetch('http://localhost:3000/api/verify-leetcode-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username })
      });
  
      const data = await response.json();
      return data.exists
    } catch (error) {
      console.error('Error verifying username:', error);
      return false;
    }
  }