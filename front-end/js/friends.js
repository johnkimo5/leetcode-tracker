document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const username = checkAuth();
    if (!username) return;
  
    // Load friends list
    loadFriendsList();
  
    // Add friend button
    document.getElementById('addFriend').addEventListener('click', function() {
      const friendUsername = document.getElementById('friendUsername').value.trim();
      if (!friendUsername) return;
  
      addFriend(friendUsername);
      document.getElementById('friendUsername').value = '';
    });
  });
  
  function loadFriendsList() {
    const friendsStr = localStorage.getItem('friends');
    const friends = friendsStr ? JSON.parse(friendsStr) : [];
    
    const friendsList = document.getElementById('friendsList');
    friendsList.innerHTML = ''; // Clear the list
    
    if (friends.length === 0) {
      friendsList.innerHTML = '<p>You haven\'t added any friends yet.</p>';
      return;
    }
    
    friends.forEach(friend => {
      fetchFriendStats(friend);
    });
  }
  
  async function fetchFriendStats(username) {
    try {
      const stats = await fetchLeetCodeStats(username);
      displayFriendStats(username, stats);
    } catch (error) {
      console.error('Error fetching friend stats:', error);
      displayError('friendsList', username);
    }
  }
  
  function displayFriendStats(username, stats) {
    if (!stats) return;
  
    const friendsList = document.getElementById('friendsList');
    const friendElement = document.createElement('div');
    friendElement.className = 'friend-stats';
    
    const totalSolved = stats.acceptedSubmissions.count;
    
    friendElement.innerHTML = `
      <div class="friend-header">
        <h4>${username}</h4>
        <button class="remove-friend" data-username="${username}">Remove</button>
      </div>
      <p>Problems Solved: ${totalSolved}</p>
    `;
    
    friendsList.appendChild(friendElement);
    
    // Add event listener for remove button
    friendElement.querySelector('.remove-friend').addEventListener('click', function() {
      removeFriend(username);
      friendElement.remove();
    });
  }
  
  function displayError(elementId, username) {
    const element = document.getElementById(elementId);
    const errorElement = document.createElement('div');
    errorElement.className = 'friend-stats error';
    errorElement.innerHTML = `<h4>${username}</h4><p class="error">Failed to fetch stats</p>`;
    element.appendChild(errorElement);
  }
  
  function addFriend(username) {
    // First verify if the friend exists
    verifyLeetCodeUsername(username).then(exists => {
      if (!exists) {
        alert('LeetCode user not found');
        return;
      }
      
      const friendsStr = localStorage.getItem('friends');
      const friends = friendsStr ? JSON.parse(friendsStr) : [];
      
      if (!friends.includes(username)) {
        friends.push(username);
        localStorage.setItem('friends', JSON.stringify(friends));
        fetchFriendStats(username);
      } else {
        alert('Friend already added');
      }
    });
  }
  
  function removeFriend(username) {
    const friendsStr = localStorage.getItem('friends');
    const friends = friendsStr ? JSON.parse(friendsStr) : [];
    
    const newFriends = friends.filter(friend => friend !== username);
    localStorage.setItem('friends', JSON.stringify(newFriends));
  }