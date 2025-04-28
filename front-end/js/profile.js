document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const username = checkAuth();
    if (!username) return;
  
    // Set the username in the UI
    document.getElementById('usernameDisplay').textContent = username;
  
    // Fetch user stats and then display them & load friends/leaderboard
    fetchUserStatsAndFriends(username);

    // Add Friend Button Listener
    const addFriendBtn = document.getElementById('addFriendBtn');
    const friendUsernameInput = document.getElementById('friendUsernameInput');
    const addFriendStatus = document.getElementById('addFriendStatus');

    addFriendBtn.addEventListener('click', async () => {
        const friendUsername = friendUsernameInput.value.trim();
        if (!friendUsername) {
            addFriendStatus.textContent = 'Please enter a username.';
            addFriendStatus.className = 'add-friend-status error';
            return;
        }
        
        addFriendBtn.disabled = true;
        addFriendStatus.textContent = 'Adding friend...';
        addFriendStatus.className = 'add-friend-status';

        try {
            await addFriend(username, friendUsername);
            addFriendStatus.textContent = `Successfully added ${friendUsername}!`;
            addFriendStatus.className = 'add-friend-status success';
            friendUsernameInput.value = ''; // Clear input
            // Reload friends list and leaderboard
            loadFriendsAndLeaderboard(username);
        } catch (error) {
            addFriendStatus.textContent = `Error: ${error.message}`;
            addFriendStatus.className = 'add-friend-status error';
            console.error('Error adding friend:', error);
        } finally {
            addFriendBtn.disabled = false;
        }
    });
  });
  
  async function fetchUserStatsAndFriends(username) {
    try {
      const stats = await fetchLeetCodeStats(username);
      displayUserStats(stats); // Display main user stats
      // Now load friends and leaderboard
      await loadFriendsAndLeaderboard(username);
    } catch (error) {
      console.error('Error fetching initial user stats:', error);
      displayError('stats-overview', username);
      // Optionally try loading friends/leaderboard even if main stats fail?
      // await loadFriendsAndLeaderboard(username);
    }
  }

  async function loadFriendsAndLeaderboard(username) {
      try {
          const friends = await getFriends(username);
          displayFriends(username, friends);

          const leaderboardData = await getLeaderboard(username);
          displayLeaderboard(username, leaderboardData);
      } catch (error) {
          console.error('Error loading friends/leaderboard:', error);
          // Display errors in relevant sections
          document.getElementById('friendsList').innerHTML = '<li class="error">Failed to load friends</li>';
          document.getElementById('leaderboardBody').innerHTML = '<tr><td colspan="3" class="error">Failed to load leaderboard</td></tr>';
      }
  }

  function displayUserStats(stats) {
    if (!stats || !stats.solvedStats || !stats.totalQuestions) {
        console.error('Incomplete stats data received:', stats);
        return;
    }

    const totalSolved = stats.solvedStats.All?.count || 0;
    const totalOverall = stats.totalQuestions.All || 0; // Denominator for the center
    const easySolved = stats.solvedStats.Easy?.count || 0;
    const totalEasy = stats.totalQuestions.Easy || 0;
    const mediumSolved = stats.solvedStats.Medium?.count || 0;
    const totalMedium = stats.totalQuestions.Medium || 0;
    const hardSolved = stats.solvedStats.Hard?.count || 0;
    const totalHard = stats.totalQuestions.Hard || 0;
    
    const progressChartDiv = document.getElementById('progressChartArea');

    // --- SVG Chart Generation --- 
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeWidth = 10;
    const svgSize = (radius + strokeWidth) * 2;
    const center = svgSize / 2;

    // Calculate percentages and angles (out of total SOLVED)
    const easyPercent = totalSolved > 0 ? easySolved / totalSolved : 0;
    const mediumPercent = totalSolved > 0 ? mediumSolved / totalSolved : 0;
    const hardPercent = totalSolved > 0 ? hardSolved / totalSolved : 0;

    // Angles in radians, starting from -PI/2 (12 o'clock)
    const startAngle = -Math.PI / 2;
    const easyAngle = easyPercent * 2 * Math.PI;
    const mediumAngle = mediumPercent * 2 * Math.PI;
    const hardAngle = hardPercent * 2 * Math.PI;

    let currentAngle = startAngle;

    // Helper function to calculate arc path 'd' attribute
    function getArcPath(startRad, endRad) {
        const startX = center + radius * Math.cos(startRad);
        const startY = center + radius * Math.sin(startRad);
        const endX = center + radius * Math.cos(endRad);
        const endY = center + radius * Math.sin(endRad);
        const largeArcFlag = (endRad - startRad) <= Math.PI ? 0 : 1;
        const sweepFlag = 1; // Clockwise
        return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
    }
    
    let svgPaths = '';

    // Easy Arc
    if (easyAngle > 0) {
        const easyEndAngle = currentAngle + easyAngle;
        // Add a tiny epsilon to avoid start/end being exactly the same for full circles
        const pathD = getArcPath(currentAngle, easyEndAngle - (easyAngle >= 2 * Math.PI - 0.001 ? 0.001 : 0)); 
        svgPaths += `<path d="${pathD}" class="progress-arc easy-arc" stroke-width="${strokeWidth}" fill="none" />`;
        currentAngle = easyEndAngle;
    }
    
    // Medium Arc
    if (mediumAngle > 0) {
        const mediumEndAngle = currentAngle + mediumAngle;
        const pathD = getArcPath(currentAngle, mediumEndAngle - (mediumAngle >= 2 * Math.PI - 0.001 ? 0.001 : 0));
        svgPaths += `<path d="${pathD}" class="progress-arc medium-arc" stroke-width="${strokeWidth}" fill="none" />`;
        currentAngle = mediumEndAngle;
    }

    // Hard Arc
    if (hardAngle > 0) {
        const hardEndAngle = currentAngle + hardAngle;
         // Adjust end angle slightly if it completes the circle to avoid rendering issues
        const endAdjusted = (hardAngle >= 2*Math.PI - 0.001 || Math.abs(hardEndAngle - startAngle) < 0.001) ? startAngle - 0.001 : hardEndAngle;
        const pathD = getArcPath(currentAngle, endAdjusted);
        svgPaths += `<path d="${pathD}" class="progress-arc hard-arc" stroke-width="${strokeWidth}" fill="none" />`;
    }

    // --- Update Inner HTML --- 
    progressChartDiv.innerHTML = `
        <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" class="progress-svg">
            <!-- Optional: Background circle -->
            <circle cx="${center}" cy="${center}" r="${radius}" stroke="#333" stroke-width="${strokeWidth}" fill="none" opacity="0.5" />
            ${svgPaths}
        </svg>
        <div class="progress-center-text">
            <span class="solved-count">${totalSolved}</span>
            <span class="total-count">/${totalOverall}</span>
            <div class="solved-label">Solved</div>
            <!-- TODO: Add "Attempting" data if available -->
        </div>
    `;

    // --- Populate Difficulty Stats Area --- 
    const difficultyStatsDiv = document.getElementById('difficultyStatsArea');
    difficultyStatsDiv.innerHTML = `
        <div class="difficulty-box easy-box">
            <div class="difficulty-label">Easy</div>
            <div class="difficulty-count">${easySolved} / ${totalEasy}</div>
        </div>
        <div class="difficulty-box medium-box">
            <div class="difficulty-label">Med.</div>
            <div class="difficulty-count">${mediumSolved} / ${totalMedium}</div>
        </div>
        <div class="difficulty-box hard-box">
            <div class="difficulty-label">Hard</div>
            <div class="difficulty-count">${hardSolved} / ${totalHard}</div>
        </div>
    `;
  }
  
  function displayError(elementId, username) {
    const element = document.getElementById(elementId);
    if (!element) return;
    // Clear previous content before showing error
    element.innerHTML = ''; 
    const errorMessage = `<p class="error">Failed to fetch stats for ${username}. Please check the username or try again later.</p>`;
    element.innerHTML = errorMessage; // Replace content with error
  }
  
  function displayFriends(currentUser, friends) {
    const friendsListUl = document.getElementById('friendsList');
    friendsListUl.innerHTML = ''; // Clear placeholder/previous list

    if (friends.length === 0) {
        friendsListUl.innerHTML = '<li>No friends added yet.</li>';
        return;
    }

    friends.forEach(friendUsername => {
        const li = document.createElement('li');
        li.textContent = friendUsername;
        
        // Add remove button (optional)
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.className = 'remove-friend-btn';
        removeBtn.onclick = async () => {
            if (confirm(`Are you sure you want to remove ${friendUsername}?`)) {
                try {
                    await removeFriend(currentUser, friendUsername);
                    loadFriendsAndLeaderboard(currentUser); // Reload list & leaderboard
                } catch (error) {
                    console.error('Error removing friend:', error);
                    alert('Failed to remove friend.'); // Simple error feedback
                }
            }
        };
        li.appendChild(removeBtn);
        
        friendsListUl.appendChild(li);
    });
}

function displayLeaderboard(currentUser, leaderboardData) {
    const leaderboardBody = document.getElementById('leaderboardBody');
    leaderboardBody.innerHTML = ''; // Clear placeholder

    if (leaderboardData.length === 0) {
        leaderboardBody.innerHTML = '<tr><td colspan="3">Leaderboard is empty.</td></tr>';
        return;
    }

    leaderboardData.forEach((user, index) => {
        const rank = index + 1;
        const tr = document.createElement('tr');
        
        if (user.username === currentUser) {
            tr.classList.add('current-user');
        }

        const rankTd = document.createElement('td');
        rankTd.textContent = rank;

        const userTd = document.createElement('td');
        userTd.textContent = user.username;

        const solvedTd = document.createElement('td');
        solvedTd.textContent = user.solved;
        if (user.solved === 'Error') {
            solvedTd.classList.add('error'); // Style errors
        }

        tr.appendChild(rankTd);
        tr.appendChild(userTd);
        tr.appendChild(solvedTd);

        leaderboardBody.appendChild(tr);
    });
}

// Note: renderActivityChart is no longer used for heatmap
function renderActivityChart(submissionCalendar) {
    const chartDiv = document.getElementById('activityChart');
    // Clear previous content (if any)
    chartDiv.innerHTML = ''; 
    // No heatmap, so this section is effectively empty now
    console.log("Submission Calendar Data (available but not rendered):", submissionCalendar);
}