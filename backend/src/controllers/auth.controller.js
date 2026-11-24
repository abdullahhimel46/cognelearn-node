const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

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

// 🛡️ Helper: ক্যালেন্ডার ডে (YYYY-MM-DD) স্টাডি স্ট্রিক ক্যালকুলেশন
const calculateStudyStreak = (sessionDates) => {
    if (!sessionDates || sessionDates.length === 0) return 0;

    // ইউনিক তারিখগুলো সেট আকারে নিয়ে সর্ট করা (নতুন থেকে পুরনো)
    const uniqueDates = [...new Set(sessionDates.map(d => new Date(d).toISOString().split('T')[0]))].sort().reverse();
    
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    // যদি আজ বা গতকাল কোনোটাই সেশনের তারিখে না থাকে, তবে স্ট্রিক ০
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
        return 0;
    }

    let streak = 0;
    let expectedDate = new Date(uniqueDates[0]);

    for (const dateStr of uniqueDates) {
        const currentDate = new Date(dateStr);
        const diffDays = Math.round((expectedDate - currentDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            streak++;
            expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
};

// ৪. Get User Analytics Dashboard Stats (GET /api/v1/users/stats)
exports.getUserStats = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [userPlaylists, completedSessions, allScores, recentSessions] = await Promise.all([
            prisma.playlist.findMany({
                where: { userId },
                select: { id: true, totalFocusMinutes: true },
            }),
            prisma.session.findMany({
                where: { userId, status: 'COMPLETED' },
                select: { id: true, completedDuration: true, startTime: true },
            }),
            prisma.attentionScore.findMany({
                where: { session: { userId } },
                select: { score: true },
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
        ]);

        // টোটাল ফোকাস মিনিট (প্লেলিস্ট বা সেশন হিসেব থেকে)
        const totalFocusMinutes = completedSessions.reduce(
            (sum, s) => sum + Math.floor((s.completedDuration || 0) / 60),
            0
        );

        // ওভারঅল গড় এটেনশন স্কোর
        const avgAttentionScore = allScores.length > 0
            ? Math.round(allScores.reduce((sum, item) => sum + item.score, 0) / allScores.length)
            : null;

        // স্টাডি স্ট্রিক
        const sessionDates = completedSessions.map(s => s.startTime);
        const streakDays = calculateStudyStreak(sessionDates);

        return res.status(200).json({
            totalPlaylists: userPlaylists.length,
            totalSessionsCompleted: completedSessions.length,
            totalFocusMinutes,
            totalFocusHours: parseFloat((totalFocusMinutes / 60).toFixed(1)),
            overallAverageAttentionScore: avgAttentionScore,
            studyStreakDays: streakDays,
            recentSessions,
        });
    } catch (error) {
        next(error);
    }
};