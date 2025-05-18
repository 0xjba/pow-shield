// Express server example
const express = require('express');
const { PowServer } = require('pow-shield');

// Create Express app
const app = express();

// Initialize PoW Shield for the server
const powServer = new PowServer({
  endpoints: ['/api/data', '/api/submit'],
  secret: process.env.POW_SECRET
});

// Apply PoW Shield middleware
app.use(powServer.expressMiddleware());

// Define routes
app.get('/api/data', (req, res) => {
  res.json({
    message: 'This is protected data',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/submit', express.json(), (req, res) => {
  res.json({
    message: 'Data received successfully',
    received: req.body
  });
});

// Public route (not protected)
app.get('/public', (req, res) => {
  res.json({
    message: 'This is public data'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});