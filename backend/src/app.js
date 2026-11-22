const express = require('express');
const cors = require('cors');

// Routes Import
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'CogneLearn API Server is running' });
});

// API Routes Mounting
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Root Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to CogneLearn API Engine' });
});

// Central Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
        },
    });
});

module.exports = app;