const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'leetcode_tracker.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Users table (optional, but good for tracking verified users)
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY NOT NULL
      )
    `, (err) => {
      if (err) {
        console.error("Error creating users table:", err.message);
      }
    });

    // Friendships table (Many-to-Many)
    db.run(`
      CREATE TABLE IF NOT EXISTS friendships (
        user_a TEXT NOT NULL,
        user_b TEXT NOT NULL,
        PRIMARY KEY (user_a, user_b),
        FOREIGN KEY (user_a) REFERENCES users(username) ON DELETE CASCADE,
        FOREIGN KEY (user_b) REFERENCES users(username) ON DELETE CASCADE,
        CHECK (user_a < user_b) -- Ensure pair uniqueness (user1, user2) not (user2, user1)
      )
    `, (err) => {
      if (err) {
        console.error("Error creating friendships table:", err.message);
      }
    });

    // You could add indexes here for performance if needed later
    // db.run('CREATE INDEX IF NOT EXISTS idx_friendships_a ON friendships(user_a);');
    // db.run('CREATE INDEX IF NOT EXISTS idx_friendships_b ON friendships(user_b);');

  });
}

module.exports = db; 