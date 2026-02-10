const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5500',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Import routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const projectRoutes = require('./routes/projects');
const commentRoutes = require('./routes/comments');
const activityRoutes = require('./routes/activity');
const userRoutes = require('./routes/users');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'FlowSync API is running',
        timestamp: new Date().toISOString()
    });
});

// Welcome route
app.get('/', (req, res) => {
    res.json({ 
        message: '🎯 Welcome to FlowSync API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            tasks: '/api/tasks',
            projects: '/api/projects',
            comments: '/api/comments',
            activity: '/api/activity',
            users: '/api/users'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Route not found' 
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║                                        ║');
    console.log('║     🎯 FlowSync API Server Running    ║');
    console.log('║                                        ║');
    console.log(`║     Port: ${PORT}                         ║`);
    console.log(`║     Environment: ${process.env.NODE_ENV || 'development'}           ║`);
    console.log('║                                        ║');
    console.log('╚════════════════════════════════════════╝');
});

module.exports = app;