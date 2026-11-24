const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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

// 🛡️ Security Headers (Helmet)
app.use(helmet());

// 🌐 CORS — only allow configured origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 🚦 Global rate limit — 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// 🔐 Strict rate limit on auth endpoints — 10 attempts per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again after 15 minutes.' },
});

app.use(express.json({ limit: '10kb' }));           // 🛡️ Body size limit to prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
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
app.use('/api/v1/auth', authLimiter, authRoutes);  // 🔐 Strict rate limit on auth
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/sessions', sessionRoutes);

// Root Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to CogneLearn API Engine' });
});

// Central Error Handler
app.use((err, req, res, next) => {
    // CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS: Origin not allowed.' });
    }
    // Log only in development
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    } else {
        console.error(`[ERROR] ${err.message}`);
    }
    res.status(err.status || 500).json({
        error: {
            message: process.env.NODE_ENV === 'production'
                ? 'Internal Server Error'
                : err.message || 'Internal Server Error',
        },
    });
});

module.exports = app;