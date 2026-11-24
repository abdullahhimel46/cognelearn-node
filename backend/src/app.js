const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./config/swagger.json');

// Routes Import
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const playlistRoutes = require('./routes/playlist.routes');
const sessionRoutes = require('./routes/session.routes');
const authMiddleware = require('./middlewares/auth.middleware');
const playlistController = require('./controllers/playlist.controller');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/v1/playlists', playlistRoutes);
app.use('/api/playlist', authMiddleware, playlistController.getPlaylistForPlayer);

// 🌟 Swagger UI Documentation Endpoint
// Server URL dynamically set so Swagger sends requests to the correct port
const PORT = process.env.PORT || 8081;
const swaggerOptions = {
    swaggerOptions: {
        persistAuthorization: true, // ✅ Token stays after page refresh
    },
};
const swaggerDocWithServer = {
    ...swaggerDocument,
    servers: [
        {
            url: `http://localhost:${PORT}`,
            description: 'Local Development Server',
        },
    ],
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocWithServer, swaggerOptions));

// Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'CogneLearn API Server is running' });
});

// API Routes Mounting
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/sessions', sessionRoutes);

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