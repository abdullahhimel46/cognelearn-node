const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/me', authMiddleware, authController.getCurrentUser);
router.get('/stats', authMiddleware, authController.getUserStats);

module.exports = router;