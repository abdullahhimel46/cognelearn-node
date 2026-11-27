const prisma = require('../config/db');

// 🛡️ Helper: validate and parse integer with bounds
const parsePositiveInt = (value, fieldName, min = 1, max = Infinity) => {
    const parsed = parseInt(value);
    if (isNaN(parsed) || parsed < min || parsed > max) {
        return { error: `${fieldName} must be an integer between ${min} and ${max}.` };
    }
    return { value: parsed };
};

// 🛡️ Bounds constants
const MAX_SESSION_DURATION_SECONDS = 8 * 60 * 60; // 8 hours max
const MAX_CYCLES = 20;
const MAX_PAGE_LIMIT = 50;

// ১. POST /api/v1/sessions/start — নতুন সেশন শুরু
exports.startSession = async (req, res, next) => {
    try {
        const { duration, cycles, playlistId, videoId } = req.body;

        // 🛡️ Validate duration (1 second to 8 hours)
        const durationResult = parsePositiveInt(duration, 'duration', 1, MAX_SESSION_DURATION_SECONDS);
        if (durationResult.error) {
            return res.status(400).json({ error: durationResult.error });
        }

        // 🛡️ Validate cycles (1 to 20)
        let parsedCycles = 1;
        if (cycles !== undefined) {
            const cyclesResult = parsePositiveInt(cycles, 'cycles', 1, MAX_CYCLES);
            if (cyclesResult.error) return res.status(400).json({ error: cyclesResult.error });
            parsedCycles = cyclesResult.value;
        }

        // 🛡️ Validate videoId type
        if (videoId !== undefined && typeof videoId !== 'string') {
            return res.status(400).json({ error: 'videoId must be a string.' });
        }

        // ইতোমধ্যে ACTIVE সেশন আছে কি না ও প্লেলিস্ট মালিকানা প্যারালালে চেক
        const [existing, playlist] = await Promise.all([
            prisma.session.findFirst({
                where: { userId: req.user.id, status: 'ACTIVE' },
                select: { id: true },
            }),
            playlistId
                ? prisma.playlist.findFirst({
                    where: { id: playlistId, userId: req.user.id },
                    select: { id: true },
                })
                : null,
        ]);

        if (existing) {
            return res.status(409).json({
                error: 'You already have an active session. Pause or complete it first.',
                sessionId: existing.id,
            });
        }

        if (playlistId && !playlist) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

        const session = await prisma.session.create({
            data: {
                duration: durationResult.value,
                completedDuration: 0,
                cycles: parsedCycles,
                status: 'ACTIVE',
                userId: req.user.id,
                playlistId: playlistId || null,
                videoId: videoId || null,
            },
        });

        return res.status(201).json({
            sessionId: session.id,
            status: session.status,
            duration: session.duration,
            completedDuration: session.completedDuration,
            cycles: session.cycles,
            playlistId: session.playlistId,
            videoId: session.videoId,
            startTime: session.startTime,
        });
    } catch (error) {
        next(error);
    }
};

// ২. PATCH /api/v1/sessions/:id/pause — সেশন পজ
exports.pauseSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { completedDuration } = req.body;

        const session = await prisma.session.findFirst({
            where: { id, userId: req.user.id },
        });
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }
        if (session.status !== 'ACTIVE') {
            return res.status(400).json({ error: `Cannot pause a session with status: ${session.status}` });
        }

        // 🛡️ Validate completedDuration if provided (0 to session duration)
        let parsedCompleted = session.completedDuration;
        if (completedDuration !== undefined) {
            const result = parsePositiveInt(completedDuration, 'completedDuration', 0, session.duration);
            if (result.error) return res.status(400).json({ error: result.error });
            parsedCompleted = result.value;
        }

        const updated = await prisma.session.update({
            where: { id },
            data: { status: 'PAUSED', completedDuration: parsedCompleted },
        });

        return res.status(200).json({
            sessionId: updated.id,
            status: updated.status,
            completedDuration: updated.completedDuration,
            duration: updated.duration,
        });
    } catch (error) {
        next(error);
    }
};

// ৩. PATCH /api/v1/sessions/:id/resume — সেশন রিজিউম
exports.resumeSession = async (req, res, next) => {
    try {
        const { id } = req.params;

        // টার্গেট সেশন ও অন্য কোনো ACTIVE সেশন আছে কি না একসাথে চেক
        const relatedSessions = await prisma.session.findMany({
            where: {
                userId: req.user.id,
                OR: [{ id }, { status: 'ACTIVE' }],
            },
            select: { id: true, status: true },
        });

        const session = relatedSessions.find((s) => s.id === id);
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }
        if (session.status !== 'PAUSED') {
            return res.status(400).json({ error: `Cannot resume a session with status: ${session.status}` });
        }

        const activeSession = relatedSessions.find((s) => s.status === 'ACTIVE');
        if (activeSession) {
            return res.status(409).json({
                error: 'Another session is already active.',
                sessionId: activeSession.id,
            });
        }

        const updated = await prisma.session.update({
            where: { id },
            data: { status: 'ACTIVE' },
        });

        return res.status(200).json({
            sessionId: updated.id,
            status: updated.status,
            completedDuration: updated.completedDuration,
            duration: updated.duration,
        });
    } catch (error) {
        next(error);
    }
};

// ৪. POST /api/v1/sessions/:id/complete — সেশন কমপ্লিট
exports.completeSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { completedDuration } = req.body;

        const session = await prisma.session.findFirst({
            where: { id, userId: req.user.id },
        });
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }
        if (session.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Session is already completed.' });
        }

        // 🛡️ Validate completedDuration if provided
        let finalDuration = session.completedDuration;
        if (completedDuration !== undefined) {
            const result = parsePositiveInt(completedDuration, 'completedDuration', 0, session.duration);
            if (result.error) return res.status(400).json({ error: result.error });
            finalDuration = result.value;
        }

        // Session ও Playlist আপডেট প্যারালালে রান করা
        const focusMinutesEarned = session.playlistId ? Math.floor(finalDuration / 60) : 0;
        const [updated] = await Promise.all([
            prisma.session.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    endTime: new Date(),
                    completedDuration: finalDuration,
                },
            }),
            focusMinutesEarned > 0
                ? prisma.playlist.update({
                    where: { id: session.playlistId },
                    data: { totalFocusMinutes: { increment: focusMinutesEarned } },
                })
                : null,
        ]);

        return res.status(200).json({
            sessionId: updated.id,
            status: updated.status,
            duration: updated.duration,
            completedDuration: updated.completedDuration,
            cycles: updated.cycles,
            startTime: updated.startTime,
            endTime: updated.endTime,
            playlistId: updated.playlistId,
            message: 'Session completed successfully.',
        });
    } catch (error) {
        next(error);
    }
};

// ৫. GET /api/v1/sessions/active — বর্তমানে চলমান সেশন
exports.getActiveSession = async (req, res, next) => {
    try {
        const session = await prisma.session.findFirst({
            where: {
                userId: req.user.id,
                status: { in: ['ACTIVE', 'PAUSED'] },
            },
            include: {
                playlist: { select: { id: true, title: true } },
            },
            orderBy: { startTime: 'desc' },
        });

        if (!session) {
            return res.status(200).json({ activeSession: null });
        }

        return res.status(200).json({
            sessionId: session.id,
            status: session.status,
            duration: session.duration,
            completedDuration: session.completedDuration,
            cycles: session.cycles,
            startTime: session.startTime,
            videoId: session.videoId,
            playlist: session.playlist,
        });
    } catch (error) {
        next(error);
    }
};

// ৬. GET /api/v1/sessions — সব সেশনের হিস্ট্রি (pagination সহ)
exports.getSessionHistory = async (req, res, next) => {
    try {
        // 🛡️ Sanitize and cap pagination params
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        const [sessions, total] = await Promise.all([
            prisma.session.findMany({
                where: { userId: req.user.id },
                orderBy: { startTime: 'desc' },
                skip,
                take: limit,
                include: {
                    playlist: { select: { id: true, title: true } },
                    attentionScores: { select: { score: true } },
                },
            }),
            prisma.session.count({ where: { userId: req.user.id } }),
        ]);

        const formatted = sessions.map((s) => {
            const scores = s.attentionScores.map((a) => a.score);
            const avgAttention = scores.length > 0
                ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                : null;

            return {
                sessionId: s.id,
                status: s.status,
                duration: s.duration,
                completedDuration: s.completedDuration,
                cycles: s.cycles,
                startTime: s.startTime,
                endTime: s.endTime,
                playlist: s.playlist,
                videoId: s.videoId,
                avgAttentionScore: avgAttention,
            };
        });

        return res.status(200).json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            sessions: formatted,
        });
    } catch (error) {
        next(error);
    }
};

// 🛡️ Helper to determine focus rating text
const getFocusRating = (avgScore) => {
    if (avgScore === null || avgScore === undefined) return 'No Data';
    if (avgScore >= 80) return 'Excellent Focus';
    if (avgScore >= 65) return 'Good Focus';
    if (avgScore >= 50) return 'Moderate Focus';
    return 'Needs Improvement';
};

// ৭. POST /api/v1/sessions/:id/attention — মনোযোগ স্কোর লগিং (একক বা ব্যাচ)
exports.logAttentionScore = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { score, scores } = req.body;

        const session = await prisma.session.findFirst({
            where: { id, userId: req.user.id },
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        // কেবল ACTIVE সেশনে স্কোর লগ করা যাবে
        if (session.status !== 'ACTIVE') {
            return res.status(400).json({
                error: `Cannot log attention scores for a session with status: ${session.status}. Session must be ACTIVE.`,
            });
        }

        // স্কোর প্রসেসিং (একক বা ব্যাচ)
        let scoresToInsert = [];

        if (Array.isArray(scores)) {
            if (scores.length === 0) {
                return res.status(400).json({ error: 'scores array cannot be empty.' });
            }
            if (scores.length > 100) {
                return res.status(400).json({ error: 'Cannot log more than 100 scores in a single batch.' });
            }
            for (let i = 0; i < scores.length; i++) {
                const s = parseInt(scores[i]);
                if (isNaN(s) || s < 0 || s > 100) {
                    return res.status(400).json({ error: `Each score must be an integer between 0 and 100. Invalid at index ${i}.` });
                }
                scoresToInsert.push({ sessionId: id, score: s });
            }
        } else if (score !== undefined) {
            const s = parseInt(score);
            if (isNaN(s) || s < 0 || s > 100) {
                return res.status(400).json({ error: 'score must be an integer between 0 and 100.' });
            }
            scoresToInsert.push({ sessionId: id, score: s });
        } else {
            return res.status(400).json({ error: 'Either score (number) or scores (array) is required.' });
        }

        // ডেটাবেজে সেভ
        await prisma.attentionScore.createMany({
            data: scoresToInsert,
        });

        return res.status(201).json({
            message: 'Attention scores logged successfully.',
            sessionId: id,
            loggedCount: scoresToInsert.length,
            latestScore: scoresToInsert[scoresToInsert.length - 1].score,
        });
    } catch (error) {
        next(error);
    }
};

// ৮. GET /api/v1/sessions/:id/report — নির্দিষ্ট সেশনের বিস্তারিত অ্যানালিটিক্স রিপোর্ট
exports.getSessionReport = async (req, res, next) => {
    try {
        const { id } = req.params;

        const session = await prisma.session.findFirst({
            where: { id, userId: req.user.id },
            include: {
                playlist: { select: { id: true, title: true } },
                attentionScores: {
                    select: { score: true, createdAt: true },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        const scores = session.attentionScores.map((a) => a.score);
        const hasScores = scores.length > 0;

        const avgScore = hasScores
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null;
        const peakScore = hasScores ? Math.max(...scores) : null;
        const lowestScore = hasScores ? Math.min(...scores) : null;

        const completionPercentage = session.duration > 0
            ? Math.min(100, Math.round((session.completedDuration / session.duration) * 100))
            : 0;

        // টাইমলাইন ডেটা চার্টের জন্য
        const timeline = session.attentionScores.map((a) => ({
            timestamp: a.createdAt,
            score: a.score,
        }));

        return res.status(200).json({
            sessionId: session.id,
            status: session.status,
            playlist: session.playlist,
            videoId: session.videoId,
            cycles: session.cycles,
            duration: session.duration,
            completedDuration: session.completedDuration,
            completionPercentage,
            startTime: session.startTime,
            endTime: session.endTime,
            analytics: {
                totalScoresLogged: scores.length,
                avgAttentionScore: avgScore,
                peakAttentionScore: peakScore,
                lowestAttentionScore: lowestScore,
                focusRating: getFocusRating(avgScore),
                timeline,
            },
        });
    } catch (error) {
        next(error);
    }
};
