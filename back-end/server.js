require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./database'); // Import the database connection

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to verify LeetCode user and add to DB if not present
async function verifyAndAddUser(username) {
  return new Promise((resolve, reject) => {
    db.get('SELECT username FROM users WHERE username = ?', [username], async (err, row) => {
      if (err) return reject(new Error('Database error checking user.'));
      if (row) return resolve(true); // User already in DB

      // If not in DB, verify with LeetCode API
      try {
        const leetcodeResponse = await axios.post('https://leetcode.com/graphql', {
          query: `query userProfile($username: String!) { matchedUser(username: $username) { username } }`,
          variables: { username }
        }, { headers: { 'Content-Type': 'application/json' } });
        
        const exists = !!leetcodeResponse.data?.data?.matchedUser;
        if (exists) {
          // Add verified user to our DB
          db.run('INSERT OR IGNORE INTO users (username) VALUES (?)', [username], (insertErr) => {
            if (insertErr) {
              console.error('Error adding verified user to DB:', insertErr);
              // Don't necessarily reject, maybe just log and continue
            }
            resolve(true);
          });
        } else {
          resolve(false); // User does not exist on LeetCode
        }
      } catch (error) {
        console.error('Error during LeetCode verification:', error.message);
        reject(new Error('Failed to verify username with LeetCode.'));
      }
    });
  });
}

// Routes
app.post('/api/verify-leetcode-user', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });
  try {
    const exists = await verifyAndAddUser(username);
    res.json({ exists });
  } catch (error) {
    console.error('Error verifying LeetCode username:', error);
    res.status(500).json({ error: error.message || 'Failed to verify username' });
  }
});

app.post('/api/leetcode-stats', async (req, res) => {
  const { username } = req.body;
  console.log(`[LOG /api/leetcode-stats] Received request for username: ${username}`);
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  const query = `
    query userProfile($username: String!) {
      allQuestionsCount {
        difficulty
        count
      }
      matchedUser(username: $username) {
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        # Get submission calendar directly under matchedUser
        submissionCalendar 
      }
    }
  `;

  const variables = { username };
  console.log(`[LOG /api/leetcode-stats] Variables sent to LeetCode API:`, variables);

  try {
    const leetcodeResponse = await axios.post('https://leetcode.com/graphql', {
      query,
      variables
    }, {
      headers: {
        'Content-Type': 'application/json'
        // Add any other necessary headers (e.g., cookies if needed for auth queries)
      }
    });
    
    const data = leetcodeResponse.data;
    console.log('LeetCode API response received on backend:', JSON.stringify(data, null, 2));

    if (data.errors) {
      console.error('LeetCode GraphQL Error:', data.errors);
      // Send a more specific error if possible, otherwise a generic one
      return res.status(500).json({ error: `LeetCode API Error: ${data.errors[0].message || 'Failed to fetch stats'}` });
    }

    const allCounts = data?.data?.allQuestionsCount;
    const userStats = data?.data?.matchedUser?.submitStatsGlobal;
    // Extract submissionCalendar directly from matchedUser
    const submissionCalendarStr = data?.data?.matchedUser?.submissionCalendar;

    // Check if essential parts exist
    if (!allCounts || !userStats || submissionCalendarStr === undefined) { 
      console.error('Incomplete data received from LeetCode API for user:', username, { allCounts, userStats, submissionCalendarStr });
      return res.status(404).json({ error: 'User not found or core data not available from LeetCode.' });
    }

    // Process the data into the desired format
    const stats = {
      totalQuestions: {},
      solvedStats: {},
      // Safely parse the submission calendar string
      submissionCalendar: JSON.parse(submissionCalendarStr || '{}') 
    };

    allCounts.forEach(item => {
        stats.totalQuestions[item.difficulty] = item.count;
    });

    userStats.acSubmissionNum.forEach(item => {
        stats.solvedStats[item.difficulty] = {
            count: item.count,
            submissions: item.submissions
        };
    });

    // Send the processed stats back to the client
    res.json(stats);

  } catch (error) {
    // Handle network errors or other issues calling LeetCode
    console.error('Error fetching LeetCode stats from backend:', error.message);
    // Check if it's an Axios error response
    if (error.response) {
      console.error('Axios Error Data:', error.response.data);
      console.error('Axios Error Status:', error.response.status);
      console.error('Axios Error Headers:', error.response.headers);
      return res.status(error.response.status || 500).json({ error: `Failed to fetch stats from LeetCode (status: ${error.response.status})` });
    } else if (error.request) {
       // The request was made but no response was received
      console.error('Axios No Response Error:', error.request);
       return res.status(504).json({ error: 'No response received from LeetCode API (Gateway Timeout).' });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Axios Setup Error:', error.message);
    }
    res.status(500).json({ error: 'Internal server error while fetching LeetCode stats.' });
  }
});

// GET user's friends
app.get('/api/friends/:username', (req, res) => {
  const { username } = req.params;
  // Query uses UNION to find friends where username is user_a OR user_b
  const sql = `
    SELECT user_b AS friend FROM friendships WHERE user_a = ?
    UNION
    SELECT user_a AS friend FROM friendships WHERE user_b = ?
  `;
  db.all(sql, [username, username], (err, rows) => {
    if (err) {
      console.error("Error fetching friends:", err.message);
      return res.status(500).json({ error: "Failed to fetch friends." });
    }
    const friends = rows.map(row => row.friend);
    res.json(friends);
  });
});

// POST Add a friend
app.post('/api/friends', async (req, res) => {
  const { username, friendUsername } = req.body;

  if (!username || !friendUsername || username === friendUsername) {
    return res.status(400).json({ error: 'Invalid usernames provided.' });
  }

  try {
    // Verify both users exist on LeetCode and add them to our DB if needed
    const userExists = await verifyAndAddUser(username);
    const friendExists = await verifyAndAddUser(friendUsername);

    if (!userExists || !friendExists) {
      return res.status(404).json({ error: 'One or both users not found on LeetCode.' });
    }

    // Ensure consistent order for primary key (user_a < user_b)
    const user_a = username < friendUsername ? username : friendUsername;
    const user_b = username < friendUsername ? friendUsername : username;

    // Add friendship to the database
    const sql = 'INSERT INTO friendships (user_a, user_b) VALUES (?, ?)';
    db.run(sql, [user_a, user_b], function(err) { // Use function() to get this.lastID
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Friendship already exists.' });
        }
        console.error("Error adding friendship:", err.message);
        return res.status(500).json({ error: 'Failed to add friend.' });
      }
      res.status(201).json({ message: 'Friend added successfully.' });
    });

  } catch (error) {
    console.error("Error in add friend process:", error);
    res.status(500).json({ error: error.message || 'Internal server error adding friend.' });
  }
});

// DELETE Remove a friend
app.delete('/api/friends', (req, res) => {
  const { username, friendUsername } = req.body;

  if (!username || !friendUsername) {
    return res.status(400).json({ error: 'Invalid usernames provided.' });
  }

  // Ensure consistent order for deletion
  const user_a = username < friendUsername ? username : friendUsername;
  const user_b = username < friendUsername ? friendUsername : username;

  const sql = 'DELETE FROM friendships WHERE user_a = ? AND user_b = ?';
  db.run(sql, [user_a, user_b], function(err) {
    if (err) {
      console.error("Error removing friendship:", err.message);
      return res.status(500).json({ error: 'Failed to remove friend.' });
    }
    if (this.changes === 0) {
        return res.status(404).json({ error: 'Friendship not found.' });
    }
    res.status(200).json({ message: 'Friend removed successfully.' });
  });
});

// GET leaderboard for a user
app.get('/api/leaderboard/:username', async (req, res) => {
  const { username } = req.params;
  let friends = [];

  // 1. Get friends from DB
  const friendSql = `
    SELECT user_b AS friend FROM friendships WHERE user_a = ?
    UNION
    SELECT user_a AS friend FROM friendships WHERE user_b = ?
  `;
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(friendSql, [username, username], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    friends = rows.map(row => row.friend);
  } catch (err) {
    console.error("Error fetching friends for leaderboard:", err.message);
    return res.status(500).json({ error: "Failed to fetch friends for leaderboard." });
  }

  // 2. Fetch stats for user + friends
  const usersToFetch = [username, ...friends];
  console.log(`[LOG /api/leaderboard] Users to fetch stats for:`, usersToFetch);
  const leaderboardData = [];
  const statsPromises = usersToFetch.map(user => {
    console.log(`[LOG /api/leaderboard] Requesting stats for user: ${user}`);
    return axios.post(`http://localhost:${PORT}/api/leetcode-stats`, { username: user })
      .then(response => ({ 
          username: user, 
          solved: response.data.solvedStats.All?.count || 0 
      }))
      .catch(error => {
          console.warn(`Failed to fetch stats for ${user} for leaderboard:`, error.message);
          return { username: user, solved: 'Error' };
      })
  });

  try {
    const results = await Promise.all(statsPromises);
    console.log(`[LOG /api/leaderboard] Stats results BEFORE sort:`, results);
    leaderboardData.push(...results);

    // 3. Sort
    leaderboardData.sort((a, b) => {
        if (a.solved === 'Error' && b.solved === 'Error') return 0;
        if (a.solved === 'Error') return 1;
        if (b.solved === 'Error') return -1;
        return b.solved - a.solved;
    });
    console.log(`[LOG /api/leaderboard] Final leaderboard data AFTER sort:`, leaderboardData);

    res.json(leaderboardData);

  } catch (error) {
    console.error("Error processing leaderboard stats:", error);
    res.status(500).json({ error: 'Failed to generate leaderboard.' });
  }
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
