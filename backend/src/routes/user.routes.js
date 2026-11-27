const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const youtubeService = require('../services/youtube.service');

// 🔒 নরমাল প্রোফাইল, স্ট্যাটস ও অ্যাচিভমেন্ট
router.get('/me', authMiddleware, authController.getCurrentUser);
router.get('/stats', authMiddleware, authController.getUserStats);
router.get('/achievements', authMiddleware, authController.getUserAchievements);
router.get('/achievements/catalog', authMiddleware, authController.getAchievementCatalog);

// 👑 অ্যাডমিনের জন্য YouTube কোটা ও হেলথ স্ট্যাটাস দেখার এন্ডপয়েন্ট
// GET /api/v1/users/admin/youtube-quota
router.get('/admin/youtube-quota', authMiddleware, (req, res) => {
    // শুধুমাত্র ADMIN দেখতে পারবে (বা ডেভেলপমেন্টে সাধারণ ইউজার টেস্ট করতে পারবে)
    const isAdmin = req.user.role === 'ADMIN' || process.env.NODE_ENV !== 'production';
    if (!isAdmin) {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const quotaStatus = youtubeService.getQuotaStatus();
    return res.status(200).json(quotaStatus);
});

module.exports = router;