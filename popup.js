document.addEventListener('DOMContentLoaded', function() {
  // Load saved usernames
  chrome.storage.sync.get(['username', 'friends'], function(data) {
    if (data.username) {
      document.getElementById('username').value = data.username;
      fetchUserStats(data.username);
    }
    if (data.friends) {
      data.friends.forEach(friend => fetchFriendStats(friend));
    }
  });

  // Save username
  document.getElementById('saveUsername').addEventListener('click', function() {
    const username = document.getElementById('username').value;
    chrome.storage.sync.set({ username }, function() {
      fetchUserStats(username);
    });
  });

  // Add friend
  document.getElementById('addFriend').addEventListener('click', function() {
    const friendUsername = document.getElementById('friendUsername').value;
    chrome.storage.sync.get(['friends'], function(data) {
      const friends = data.friends || [];
      if (!friends.includes(friendUsername)) {
        friends.push(friendUsername);
        chrome.storage.sync.set({ friends }, function() {
          fetchFriendStats(friendUsername);
          document.getElementById('friendUsername').value = '';
        });
      }
    });
  });
});

async function fetchUserStats(username) {
  try {
    const stats = await fetchLeetCodeStats(username);
    displayUserStats(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    displayError('userStats', username);
  }
}

async function fetchFriendStats(username) {
  try {
    const stats = await fetchLeetCodeStats(username);
    displayFriendStats(username, stats);
  } catch (error) {
    console.error('Error fetching friend stats:', error);
    displayError('friendStats', username);
  }
}

async function fetchLeetCodeStats(username) {
  const endpoint = 'https://leetcode.com/graphql';
  
  const query = `
    query userProfile($username: String!) {
      matchedUser(username: $username) {
        submitStats: submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
          totalSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { username }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data?.matchedUser) {
      throw new Error('User not found');
    }

    const stats = data.data.matchedUser.submitStats;
    return {
      submitStatsGlobal: {
        count: stats.acSubmissionNum.reduce((total, item) => total + item.count, 0),
        submissions: stats.totalSubmissionNum.reduce((total, item) => total + item.count, 0)
      }
    };
  } catch (error) {
    console.error('Error fetching LeetCode stats:', error);
    throw new Error(`Failed to fetch stats for ${username}: ${error.message}`);
  }
}

function displayUserStats(stats) {
  const userStatsDiv = document.getElementById('userStats');
  userStatsDiv.innerHTML = `
    <p>Total Solved: ${stats.submitStatsGlobal.count}</p>
    <p>Total Submissions: ${stats.submitStatsGlobal.submissions}</p>
  `;
}

function displayFriendStats(username, stats) {
  const friendStatsDiv = document.getElementById('friendStats');
  const friendStatElement = document.createElement('div');
  friendStatElement.className = 'friend-stats';
  friendStatElement.innerHTML = `
    <h4>${username}</h4>
    <p>Total Solved: ${stats.submitStatsGlobal.count}</p>
    <p>Total Submissions: ${stats.submitStatsGlobal.submissions}</p>
  `;
  friendStatsDiv.appendChild(friendStatElement);
}

function displayError(elementId, username) {
  const element = document.getElementById(elementId);
  const errorMessage = `<p class="error">Failed to fetch stats for ${username}</p>`;
  if (elementId === 'userStats') {
    element.innerHTML = errorMessage;
  } else {
    const friendStatElement = document.createElement('div');
    friendStatElement.className = 'friend-stats error';
    friendStatElement.innerHTML = `<h4>${username}</h4>${errorMessage}`;
    element.appendChild(friendStatElement);
  }
}