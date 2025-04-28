// Common API functions used across the site
const API_URL = 'http://localhost:3000';

async function fetchLeetCodeStats(username) {
    const endpoint = `${API_URL}/api/leetcode-stats`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      });
  
      if (!response.ok) {
        // Try to parse error message from backend response
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // Ignore if response is not JSON
        }
        const errorMessage = errorData?.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const stats = await response.json();
      console.log('Stats received from backend:', stats);
      return stats;
  
    } catch (error) {
      console.error('Error fetching LeetCode stats via backend:', error);
      throw error;
    }
  }
  
  // Function to check if user is logged in on any page
  function checkAuth() {
    const username = localStorage.getItem('username');
    if (!username) {
      window.location.href = '../index.html';
      return false;
    }
    return username;
  }
  
  // Handle logout on any page
  document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('username');
        localStorage.removeItem('friends');
        localStorage.removeItem('company');
        window.location.href = '../index.html';
      });
    }
  });

async function verifyLeetCodeUsername(username) {
  try {
    const response = await fetch(`${API_URL}/api/verify-leetcode-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username })
    });
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

// --- Friend Management (using backend API) ---

// Gets the list of friends for the current user from the backend
async function getFriends(username) {
    if (!username) return [];
    const response = await fetch(`${API_URL}/api/friends/${username}`);
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch friends: ${response.status}`);
    }
    return await response.json();
}

// Adds a friend for the current user via the backend
async function addFriend(username, friendUsername) {
    if (!username || !friendUsername || username === friendUsername) {
        throw new Error('Invalid input for adding friend.');
    }

    const response = await fetch(`${API_URL}/api/friends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, friendUsername })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || `Failed to add friend: ${response.status}`);
    }
    // No need to return list, the calling function will refetch
}

// Removes a friend for the current user via the backend
async function removeFriend(username, friendToRemove) {
     if (!username || !friendToRemove) throw new Error('Invalid input for removing friend.');

     const response = await fetch(`${API_URL}/api/friends`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, friendUsername: friendToRemove })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || `Failed to remove friend: ${response.status}`);
    }
    // No need to return list, the calling function will refetch
}

// --- Leaderboard (using backend API) ---

// Fetches leaderboard data from the backend
async function getLeaderboard(username) {
    if (!username) return [];
    const response = await fetch(`${API_URL}/api/leaderboard/${username}`);
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch leaderboard: ${response.status}`);
    }
    return await response.json();
}