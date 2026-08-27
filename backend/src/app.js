/**
 * Express Application Setup
 * Configures middleware, security headers, CORS, request logging, and API routing.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');

// Route Modules
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const milestoneRoutes = require('./routes/milestoneRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const alertRoutes = require('./routes/alertRoutes');

const app = express();

// Security and Logging Middleware
app.use(helmet());
app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check Endpoints
app.get(['/health', '/api/health'], (req, res) => {
  return res.status(200).json({
    status: 'online',
    service: 'MPLADS Backend Gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount Core API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertRoutes);

// 404 Not Found Handler
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  return res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error occurred.',
    path: req.originalUrl,
  });
});

module.exports = app;
