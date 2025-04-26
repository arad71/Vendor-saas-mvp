require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { verifyAuth } = require('./middleware/auth');

// Import routes
const bookingRoutes = require('./routes/bookings');
const listingRoutes = require('./routes/listings');
const stripeRoutes = require('./routes/stripe');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/users', userRoutes);

// Webhook endpoint needs raw body
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
