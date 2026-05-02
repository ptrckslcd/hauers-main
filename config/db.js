require('dotenv').config();
const mysql = require('mysql2/promise');

// Create a connection pool instead of a single connection
// This handles multiple concurrent connections efficiently
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', // Default XAMPP password is empty
  database: process.env.DB_NAME || 'hauers_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection right away
pool.getConnection()
  .then(connection => {
    console.log('✅ Successfully connected to the MySQL Database!');
    connection.release(); // release it back to the pool
  })
  .catch(err => {
    console.error('❌ Failed connecting to MySQL Database:');
    console.error(err.message);
    console.log('Please ensure XAMPP MySQL is running and the database exists.');
  });

module.exports = pool;