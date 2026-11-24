const prisma = require('../config/db');

// 🛡️ Constants
const MAX_PLAYLIST_TITLE_LENGTH = 200;
const MAX_VIDEOS_PER_PLAYLIST = 200;

// ১. GET /api/v1/playlists — ইউজারের সব প্লেলিস্ট
exports.list = async (req, res, next) => {
    try {
        const playlists = await prisma.playlist.findMany({
            where: { userId: req.user.id },
            include: { videos: true },
            orderBy: { createdAt: 'desc' },
        });

        const response = playlists.map((p) => ({
            playlistId: p.id,
            title: p.title,
            description: p.description,
            createdAt: p.createdAt,
            totalFocusMinutes: p.totalFocusMinutes,
            videos: p.videos.map((v) => ({
                id: v.id,
                title: v.title,
                kind: v.kind,
                subtitle: v.subtitle,
            })),
        }));

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

// ২. POST /api/v1/playlists — নতুন প্লেলিস্ট তৈরি
exports.create = async (req, res, next) => {
    try {
        const { title, description, videos } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required.' });
        }

        // 🛡️ Length limits
        if (title.trim().length > MAX_PLAYLIST_TITLE_LENGTH) {
            return res.status(400).json({ error: `Title must be at most ${MAX_PLAYLIST_TITLE_LENGTH} characters.` });
        }
        // 🛡️ Cap initial videos
        if (videos && videos.length > MAX_VIDEOS_PER_PLAYLIST) {
            return res.status(400).json({ error: `Cannot add more than ${MAX_VIDEOS_PER_PLAYLIST} videos at once.` });
        }

        const playlist = await prisma.playlist.create({
            data: {
                title: title.trim(),
                description: description?.trim() || null,
                userId: req.user.id,
                videos: videos && videos.length > 0
                    ? {
                        create: videos.map((v) => ({
                            id: v.id,
                            title: v.title,
                            kind: v.kind || 'youtube#video',
                            subtitle: v.subtitle || null,
                        })),
                    }
                    : undefined,
            },
            include: { videos: true },
        });

        res.status(200).json({
            playlistId: playlist.id,
            title: playlist.title,
            description: playlist.description,
            createdAt: playlist.createdAt,
            totalFocusMinutes: playlist.totalFocusMinutes,
            videos: playlist.videos,
        });
    } catch (error) {
        next(error);
    }
};

// ৩. GET /api/v1/playlists/:playlistId — একটি প্লেলিস্টের বিস্তারিত
exports.get = async (req, res, next) => {
    try {
        const playlist = await prisma.playlist.findFirst({
            where: { id: req.params.playlistId, userId: req.user.id },
            include: { videos: true },
        });

        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

        res.status(200).json({
            playlistId: playlist.id,
            title: playlist.title,
            description: playlist.description,
            createdAt: playlist.createdAt,
            totalFocusMinutes: playlist.totalFocusMinutes,
            videos: playlist.videos,
        });
    } catch (error) {
        next(error);
    }
};

// ৪. PATCH /api/v1/playlists/:playlistId — প্লেলিস্ট আপডেট
exports.update = async (req, res, next) => {
    try {
        const { title, description, videos } = req.body;

        // প্লেলিস্ট ইউজারের কি না চেক
        const existing = await prisma.playlist.findFirst({
            where: { id: req.params.playlistId, userId: req.user.id },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

        // ভিডিও আপডেট: পুরনো সব মুছে নতুন করে সেট করা
        if (videos !== undefined) {
            await prisma.video.deleteMany({ where: { playlistId: existing.id } });
        }

        const playlist = await prisma.playlist.update({
            where: { id: req.params.playlistId },
            data: {
                title: title?.trim() || existing.title,
                description: description?.trim() ?? existing.description,
                videos: videos !== undefined
                    ? {
                        create: videos.map((v) => ({
                            id: v.id,
                            title: v.title,
                            kind: v.kind || 'youtube#video',
                            subtitle: v.subtitle || null,
                        })),
                    }
                    : undefined,
            },
            include: { videos: true },
        });

        res.status(200).json({
            playlistId: playlist.id,
            title: playlist.title,
            description: playlist.description,
            createdAt: playlist.createdAt,
            totalFocusMinutes: playlist.totalFocusMinutes,
            videos: playlist.videos,
        });
    } catch (error) {
        next(error);
    }
};

// ৫. DELETE /api/v1/playlists/:playlistId — প্লেলিস্ট ডিলিট
exports.delete = async (req, res, next) => {
    try {
        const existing = await prisma.playlist.findFirst({
            where: { id: req.params.playlistId, userId: req.user.id },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

        await prisma.playlist.delete({ where: { id: req.params.playlistId } });

        res.status(200).json({ message: 'Playlist deleted successfully.' });
    } catch (error) {
        next(error);
    }
};

// ৬. POST /api/v1/playlists/:playlistId/videos — ভিডিও যোগ করা
exports.addVideo = async (req, res, next) => {
    try {
        const { id, title, kind, subtitle } = req.body;

        if (!id || !title) {
            return res.status(400).json({ error: 'Video id and title are required.' });
        }

        const playlist = await prisma.playlist.findFirst({
            where: { id: req.params.playlistId, userId: req.user.id },
        });

        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

        // ভিডিও ইতোমধ্যে আছে কিনা চেক
        const existingVideo = await prisma.video.findFirst({
            where: { id, playlistId: playlist.id },
        });

        if (!existingVideo) {
            await prisma.video.create({
                data: {
                    id,
                    title,
                    kind: kind || 'youtube#video',
                    subtitle: subtitle || null,
                    playlistId: playlist.id,
                },
            });
        }

        const updated = await prisma.playlist.findUnique({
            where: { id: playlist.id },
            include: { videos: true },
        });

        res.status(200).json({
            playlistId: updated.id,
            title: updated.title,
            description: updated.description,
            createdAt: updated.createdAt,
            totalFocusMinutes: updated.totalFocusMinutes,
            videos: updated.videos,
        });
    } catch (error) {
        next(error);
    }
};

// ৭. DELETE /api/v1/playlists/:playlistId/videos/:videoId — ভিডিও রিমুভ
exports.removeVideo = async (req, res, next) => {
    try {
        const { playlistId, videoId } = req.params;

        const playlist = await prisma.playlist.findFirst({
            where: { id: playlistId, userId: req.user.id },
        });

        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

        await prisma.video.deleteMany({
            where: { id: videoId, playlistId },
        });

        const updated = await prisma.playlist.findUnique({
            where: { id: playlistId },
            include: { videos: true },
        });

        res.status(200).json({
            playlistId: updated.id,
            title: updated.title,
            description: updated.description,
            createdAt: updated.createdAt,
            totalFocusMinutes: updated.totalFocusMinutes,
            videos: updated.videos,
        });
    } catch (error) {
        next(error);
    }
};

// ৮. GET /api/playlist — Playlist Player এর জন্য অপ্টিমাইজড ডেটা
exports.getPlaylistForPlayer = async (req, res, next) => {
    try {
        const { playlistId } = req.query;

        const playlist = await prisma.playlist.findFirst({
            where: { id: playlistId || undefined, userId: req.user.id },
            include: { videos: true },
            orderBy: { createdAt: 'desc' },
        });

        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

        res.status(200).json({
            playlistId: playlist.id,
            playlistTitle: playlist.title,
            description: playlist.description,
            videos: playlist.videos.map((v) => ({
                id: v.id,
                title: v.title,
                youtubeId: v.id,       // YouTube videoId হিসেবে ব্যবহার হচ্ছে
                thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
                duration: v.duration || null,
            })),
        });
    } catch (error) {
        next(error);
    }
};