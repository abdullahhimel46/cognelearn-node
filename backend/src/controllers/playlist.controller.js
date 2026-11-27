const prisma = require('../config/db');
const youtubeService = require('../services/youtube.service');
const achievementService = require('../services/achievement.service');

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

// ৪. PATCH /api/v1/playlists/:playlistId — প্লেলিস্ট আপডেট (single DB round-trip)
exports.update = async (req, res, next) => {
    try {
        const { title, description, videos } = req.body;

        if (title && title.trim().length > MAX_PLAYLIST_TITLE_LENGTH) {
            return res.status(400).json({ error: `Title must be at most ${MAX_PLAYLIST_TITLE_LENGTH} characters.` });
        }
        if (videos && videos.length > MAX_VIDEOS_PER_PLAYLIST) {
            return res.status(400).json({ error: `Cannot add more than ${MAX_VIDEOS_PER_PLAYLIST} videos at once.` });
        }

        const updateData = {};
        if (title && title.trim()) {
            updateData.title = title.trim();
        }
        if (description !== undefined) {
            updateData.description = description?.trim() || null;
        }
        if (videos !== undefined) {
            updateData.videos = {
                deleteMany: {},
                create: videos.map((v) => ({
                    id: v.id,
                    title: v.title,
                    kind: v.kind || 'youtube#video',
                    subtitle: v.subtitle || null,
                })),
            };
        }

        const playlist = await prisma.playlist.update({
            where: { id: req.params.playlistId, userId: req.user.id },
            data: updateData,
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
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Playlist not found.' });
        }
        next(error);
    }
};

// ৫. DELETE /api/v1/playlists/:playlistId — প্লেলিস্ট ডিলিট (single DB round-trip)
exports.delete = async (req, res, next) => {
    try {
        const deleted = await prisma.playlist.deleteMany({
            where: { id: req.params.playlistId, userId: req.user.id },
        });

        if (deleted.count === 0) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

        res.status(200).json({ message: 'Playlist deleted successfully.' });
    } catch (error) {
        next(error);
    }
};

// ৬. POST /api/v1/playlists/:playlistId/videos — ভিডিও যোগ করা (single DB round-trip via nested upsert)
exports.addVideo = async (req, res, next) => {
    try {
        const { id, title, kind, subtitle } = req.body;

        if (!id || !title) {
            return res.status(400).json({ error: 'Video id and title are required.' });
        }

        const updated = await prisma.playlist.update({
            where: { id: req.params.playlistId, userId: req.user.id },
            data: {
                videos: {
                    upsert: {
                        where: { id_playlistId: { id, playlistId: req.params.playlistId } },
                        create: {
                            id,
                            title,
                            kind: kind || 'youtube#video',
                            subtitle: subtitle || null,
                        },
                        update: {},
                    },
                },
            },
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
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Playlist not found.' });
        }
        next(error);
    }
};

// ৭. DELETE /api/v1/playlists/:playlistId/videos/:videoId — ভিডিও রিমুভ (single DB round-trip)
exports.removeVideo = async (req, res, next) => {
    try {
        const { playlistId, videoId } = req.params;

        const updated = await prisma.playlist.update({
            where: { id: playlistId, userId: req.user.id },
            data: {
                videos: {
                    deleteMany: { id: videoId },
                },
            },
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
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Playlist not found.' });
        }
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

// ৯. POST /api/v1/playlists/import-youtube — YouTube প্লেলিস্ট অটো-ইমপোর্ট
exports.importYouTubePlaylist = async (req, res, next) => {
    try {
        const { url, customTitle } = req.body;

        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'YouTube playlist URL or ID is required.' });
        }

        // YouTube থেকে প্লেলিস্ট ফেচ (Hybrid service)
        const { playlistTitle, videos, source } = await youtubeService.fetchPlaylist(url);

        if (!videos || videos.length === 0) {
            return res.status(404).json({ error: 'No videos found in this playlist. It may be private or empty.' });
        }

        // ডাটাবেজে প্লেলিস্ট ও ভিডিও সেভ
        const playlist = await prisma.playlist.create({
            data: {
                title: (customTitle && customTitle.trim()) || playlistTitle,
                description: `Imported from YouTube · ${videos.length} videos`,
                userId: req.user.id,
                videos: {
                    create: videos.map((v) => ({
                        id: v.id,
                        title: v.title,
                        kind: v.kind || 'youtube#video',
                        thumbnail: v.thumbnail || null,
                        duration: v.duration || null,
                    })),
                },
            },
            include: { videos: true },
        });

        return res.status(201).json({
            playlistId: playlist.id,
            title: playlist.title,
            description: playlist.description,
            source,
            totalVideos: playlist.videos.length,
            createdAt: playlist.createdAt,
        });
    } catch (error) {
        // YouTube-specific errors → 400/404
        if (error.message.includes('Invalid YouTube') || error.message.includes('URL')) {
            return res.status(400).json({ error: error.message });
        }
        if (error.message.includes('not found') || error.message.includes('private')) {
            return res.status(404).json({ error: error.message });
        }
        next(error);
    }
};

// ১০. PATCH /api/v1/playlists/:playlistId/videos/:videoId/progress — ভিডিও প্রগ্রেস আপডেট
exports.updateVideoProgress = async (req, res, next) => {
    try {
        const { playlistId, videoId } = req.params;
        const { watchedSeconds, isCompleted } = req.body;

        // ইনপুট ভ্যালিডেশন সবার আগে (invalid হলে যেন অযথা DB কল না হয়)
        const updateData = {};
        if (watchedSeconds !== undefined) {
            const ws = parseInt(watchedSeconds);
            if (isNaN(ws) || ws < 0) {
                return res.status(400).json({ error: 'watchedSeconds must be a non-negative integer.' });
            }
            updateData.watchedSeconds = ws;
        }
        if (isCompleted !== undefined) {
            if (typeof isCompleted !== 'boolean') {
                return res.status(400).json({ error: 'isCompleted must be a boolean (true or false).' });
            }
            updateData.isCompleted = isCompleted;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'At least one of watchedSeconds or isCompleted is required.' });
        }

        // Single DB round-trip: ownership + update একসাথে
        const updated = await prisma.video.update({
            where: {
                id_playlistId: { id: videoId, playlistId },
                playlist: { userId: req.user.id },
            },
            data: updateData,
        });

        // ভিডিও কমপ্লিট হলে ব্যাজ চেক (fire-and-forget)
        if (updated.isCompleted === true) {
            achievementService
                .checkAndAwardBadges(req.user.id, 'VIDEO_COMPLETED', { playlistId, videoId })
                .catch(() => {});
        }

        return res.status(200).json({
            videoId: updated.id,
            playlistId: updated.playlistId,
            title: updated.title,
            watchedSeconds: updated.watchedSeconds,
            isCompleted: updated.isCompleted,
        });
    } catch (error) {
        if (error.code === 'P2025') {
            const playlist = await prisma.playlist.findFirst({
                where: { id: req.params.playlistId, userId: req.user.id },
                select: { id: true },
            });
            return res.status(404).json({
                error: playlist ? 'Video not found in this playlist.' : 'Playlist not found.',
            });
        }
        next(error);
    }
};