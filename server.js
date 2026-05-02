// Load environment variables early
require('dotenv').config();

const app = require('./app');
const db = require('./config/db'); // Initialize DB pool and connection test

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Hauers is running at http://localhost:${PORT}`);
});

// Vercel serverless: export the Express app as the handler
module.exports = app;