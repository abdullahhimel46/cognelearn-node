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

        // ইতোমধ্যে ACTIVE সেশন আছে কি না চেক
        const existing = await prisma.session.findFirst({
            where: { userId: req.user.id, status: 'ACTIVE' },
        });
        if (existing) {
            return res.status(409).json({
                error: 'You already have an active session. Pause or complete it first.',
                sessionId: existing.id,
            });
        }

        // প্লেলিস্ট ইউজারের কি না যাচাই (optional)
        if (playlistId) {
            const playlist = await prisma.playlist.findFirst({
                where: { id: playlistId, userId: req.user.id },
            });
            if (!playlist) {
                return res.status(404).json({ error: 'Playlist not found.' });
            }
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

        const session = await prisma.session.findFirst({
            where: { id, userId: req.user.id },
        });
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }
        if (session.status !== 'PAUSED') {
            return res.status(400).json({ error: `Cannot resume a session with status: ${session.status}` });
        }

        // অন্য কোনো ACTIVE সেশন নেই তো?
        const activeSession = await prisma.session.findFirst({
            where: { userId: req.user.id, status: 'ACTIVE' },
        });
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

        const updated = await prisma.session.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                endTime: new Date(),
                completedDuration: finalDuration,
            },
        });

        // প্লেলিস্টের totalFocusMinutes আপডেট (সেকেন্ড → মিনিট রূপান্তর)
        if (session.playlistId && finalDuration > 0) {
            const focusMinutesEarned = Math.floor(finalDuration / 60);
            await prisma.playlist.update({
                where: { id: session.playlistId },
                data: { totalFocusMinutes: { increment: focusMinutesEarned } },
            });
        }

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
