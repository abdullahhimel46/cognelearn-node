const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Header চেক: Bearer <token>
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Access denied. No token provided.',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cognelearn_secret_key');
        req.user = decoded; // { id, email, role }
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Invalid or expired token.',
        });
    }
};

module.exports = authMiddleware;