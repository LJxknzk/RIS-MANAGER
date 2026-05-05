const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const requestsRoutes = require('./routes/requests');
const inventoryRoutes = require('./routes/inventory');
const departmentsRoutes = require('./routes/departments');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || '*',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'RIS Manager Backend is running' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/departments', departmentsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ RIS Manager Backend running on http://localhost:${PORT}`);
  console.log(`✓ API endpoints available at http://localhost:${PORT}/api`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
});
