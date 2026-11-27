const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { BADGE_CATALOG, BADGE_MAP, calculateStudyStreak } = require('../services/achievement.service');

// 🛡️ Email format validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// JWT টোকেন জেনারেট ফাংশন
const generateToken = (user) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables.');
    }
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        secret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// ১. Signup (POST /api/v1/auth/signup)
exports.signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // ভ্যালিডেশন — required fields
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        // 🛡️ Max length checks (DoS prevention)
        if (name.trim().length > 100) {
            return res.status(400).json({ error: 'Name must be at most 100 characters.' });
        }
        if (email.trim().length > 254) {
            return res.status(400).json({ error: 'Email must be at most 254 characters.' });
        }
        if (password.length > 128) {
            return res.status(400).json({ error: 'Password must be at most 128 characters.' });
        }

        // 🛡️ Email format validation
        if (!EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({ error: 'Invalid email format.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        // ইউজার ইতিমধ্যে আছে কি না চেক
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (existingUser) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        // পাসওয়ার্ড হ্যাশ করা
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ডেটাবেজে ইউজার সেভ করা
        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                role: 'USER',
            },
        });

        const token = generateToken(user);

        // সিকিউরিটির জন্য পাসওয়ার্ড বাদ দিয়ে রেসপন্স পাঠানো
        return res.status(200).json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                xpPoints: user.xpPoints ?? 0,
                createdAt: user.createdAt,
            },
            token,
        });
    } catch (error) {
        next(error);
    }
};

// ২. Login (POST /api/v1/auth/login)
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // পাসওয়ার্ড ম্যাচিং চেক
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = generateToken(user);

        return res.status(200).json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                xpPoints: user.xpPoints ?? 0,
                createdAt: user.createdAt,
            },
            token,
        });
    } catch (error) {
        next(error);
    }
};

// ৩. Get Current User Profile (GET /api/v1/auth/me & /api/v1/users/me)
exports.getCurrentUser = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                xpPoints: true,
                createdAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        return res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

// ৪. Get User Analytics Dashboard Stats (GET /api/v1/users/stats)
exports.getUserStats = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [user, totalPlaylists, completedSessions, scoreAgg, recentSessions, totalBadgesEarned] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { xpPoints: true },
            }),
            prisma.playlist.count({
                where: { userId },
            }),
            prisma.session.findMany({
                where: { userId, status: 'COMPLETED' },
                select: { completedDuration: true, startTime: true },
            }),
            // Compute average inside PostgreSQL instead of transferring every score row over WAN
            prisma.attentionScore.aggregate({
                where: { session: { userId } },
                _avg: { score: true },
            }),
            prisma.session.findMany({
                where: { userId },
                orderBy: { startTime: 'desc' },
                take: 5,
                select: {
                    id: true,
                    status: true,
                    duration: true,
                    completedDuration: true,
                    startTime: true,
                    endTime: true,
                    playlist: { select: { id: true, title: true } },
                },
            }),
            prisma.achievement.count({
                where: { userId },
            }),
        ]);

        // টোটাল ফোকাস মিনিট (প্লেলিস্ট বা সেশন হিসেব থেকে)
        const totalFocusMinutes = completedSessions.reduce(
            (sum, s) => sum + Math.floor((s.completedDuration || 0) / 60),
            0
        );

        // ওভারঅল গড় এটেনশন স্কোর
        const avgAttentionScore = scoreAgg._avg.score !== null
            ? Math.round(scoreAgg._avg.score)
            : null;

        // স্টাডি স্ট্রিক
        const sessionDates = completedSessions.map(s => s.startTime);
        const streakDays = calculateStudyStreak(sessionDates);

        return res.status(200).json({
            totalPlaylists,
            totalSessionsCompleted: completedSessions.length,
            totalFocusMinutes,
            totalFocusHours: parseFloat((totalFocusMinutes / 60).toFixed(1)),
            overallAverageAttentionScore: avgAttentionScore,
            studyStreakDays: streakDays,
            xpPoints: user?.xpPoints ?? 0,
            totalBadgesEarned,
            recentSessions,
        });
    } catch (error) {
        next(error);
    }
};

// ৫. Get User Earned Achievements (GET /api/v1/users/achievements)
exports.getUserAchievements = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [achievements, user] = await Promise.all([
            prisma.achievement.findMany({
                where: { userId },
                orderBy: { earnedAt: 'desc' },
                select: { badgeKey: true, earnedAt: true },
            }),
            prisma.user.findUnique({
                where: { id: userId },
                select: { xpPoints: true },
            }),
        ]);

        const formatted = achievements.map((a) => {
            const meta = BADGE_MAP.get(a.badgeKey) || {
                badgeKey: a.badgeKey,
                title: a.badgeKey,
                description: '',
                icon: '🏅',
            };
            return {
                badgeKey: a.badgeKey,
                title: meta.title,
                description: meta.description,
                icon: meta.icon,
                earnedAt: a.earnedAt,
            };
        });

        return res.status(200).json({
            achievements: formatted,
            totalEarned: formatted.length,
            xpPoints: user?.xpPoints ?? 0,
        });
    } catch (error) {
        next(error);
    }
};

// ৬. Get Full Achievement Catalog (GET /api/v1/users/achievements/catalog)
exports.getAchievementCatalog = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const earned = await prisma.achievement.findMany({
            where: { userId },
            select: { badgeKey: true, earnedAt: true },
        });

        const earnedMap = new Map(earned.map((e) => [e.badgeKey, e.earnedAt]));

        const catalog = BADGE_CATALOG.map((badge) => ({
            ...badge,
            earned: earnedMap.has(badge.badgeKey),
            earnedAt: earnedMap.get(badge.badgeKey) || null,
        }));

        return res.status(200).json({
            catalog,
            totalBadges: catalog.length,
            totalEarned: earned.length,
        });
    } catch (error) {
        next(error);
    }
};