document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const username = checkAuth();
    if (!username) return;
  
    // Load leaderboard
    loadLeaderboard();
  });
  
  async function loadLeaderboard() {
    const leaderboardDiv = document.getElementById('leaderboard');
    leaderboardDiv.innerHTML = '<p>Loading leaderboard...</p>';
    
    // Get current user and friends
    const currentUser = localStorage.getItem('username');
    const friendsStr = localStorage.getItem('friends');
    const friends = friendsStr ? JSON.parse(friendsStr) : [];
    
    // Combine current user and friends
    const allUsers = [currentUser, ...friends];
    
    try {
      // Fetch stats for all users
      const leaderboardData = await Promise.all(
        allUsers.map(async username => {
          try {
            const stats = await fetchLeetCodeStats(username);
            return {
              username,
              solved: stats.acceptedSubmissions.count,
              isCurrentUser: username === currentUser
            };
          } catch (error) {
            console.error(`Error fetching stats for ${username}:`, error);
            return {
              username,
              solved: 0,
              isCurrentUser: username === currentUser,
              error: true
            };
          }
        })
      );
      
      // Sort by problems solved (descending)
      leaderboardData.sort((a, b) => b.solved - a.solved);
      
      // Display the leaderboard
      displayLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      leaderboardDiv.innerHTML = '<p class="error">Failed to load leaderboard</p>';
    }
  }
  
  function displayLeaderboard(data) {
    const leaderboardDiv = document.getElementById('leaderboard');
    leaderboardDiv.innerHTML = '';
    
    if (data.length === 0) {
      leaderboardDiv.innerHTML = '<p>No users to display.</p>';
      return;
    }
    
    // Create table
    const table = document.createElement('table');
    table.className = 'leaderboard-table';
    
    // Add header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Rank</th>
        <th>Username</th>
        <th>Problems Solved</th>
      </tr>
    `;
    table.appendChild(thead);
    
    // Add body
    const tbody = document.createElement('tbody');
    
    data.forEach((user, index) => {
      const row = document.createElement('tr');
      if (user.isCurrentUser) {
        row.className = 'current-user';
      }
      if (user.error) {
        row.className += ' error-row';
      }
      
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${user.username}</td>
        <td>${user.error ? 'Error' : user.solved}</td>
      `;
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    leaderboardDiv.appendChild(table);
  }