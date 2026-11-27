const prisma = require('../config/db');

// 🏆 সব সম্ভাব্য ব্যাজের ক্যাটালগ
const BADGE_CATALOG = [
    {
        badgeKey: 'FIRST_SESSION',
        title: 'প্রথম পদক্ষেপ',
        description: 'প্রথম সেশন কমপ্লিট করেছেন',
        icon: '🎯',
    },
    {
        badgeKey: 'STREAK_3',
        title: '৩ দিনের চ্যাম্পিয়ন',
        description: '৩ দিন টানা পড়াশোনা করুন',
        icon: '🔥',
    },
    {
        badgeKey: 'STREAK_7',
        title: 'সপ্তাহের যোদ্ধা',
        description: '৭ দিন টানা পড়াশোনা করুন',
        icon: '⚡',
    },
    {
        badgeKey: 'STREAK_30',
        title: 'মাসিক কিংবদন্তি',
        description: '৩০ দিন টানা পড়াশোনা করুন',
        icon: '👑',
    },
    {
        badgeKey: 'PERFECT_FOCUS',
        title: 'লেজার ফোকাস',
        description: 'কোনো সেশনে গড় এটেনশন স্কোর ৯০ বা তার বেশি',
        icon: '🧠',
    },
    {
        badgeKey: 'FOCUS_MASTER',
        title: 'মনোযোগ মাস্টার',
        description: '৫টি সেশনে গড় এটেনশন স্কোর ৮০ বা তার বেশি',
        icon: '🏆',
    },
    {
        badgeKey: 'VIDEO_FINISHER',
        title: 'প্রথম ভিডিও শেষ',
        description: 'প্রথম ভিডিও সম্পূর্ণ দেখেছেন',
        icon: '📺',
    },
    {
        badgeKey: 'PLAYLIST_MASTER',
        title: 'প্লেলিস্ট বিজয়ী',
        description: 'একটি প্লেলিস্টের সব ভিডিও কমপ্লিট করেছেন',
        icon: '🎓',
    },
    {
        badgeKey: 'HOUR_CLUB',
        title: 'ঘণ্টা ক্লাব',
        description: 'মোট ১ ঘণ্টা (৬০ মিনিট) ফোকাস স্টাডি সম্পন্ন',
        icon: '⏰',
    },
    {
        badgeKey: 'MARATHON_STUDIER',
        title: 'ম্যারাথন স্টুডেন্ট',
        description: 'মোট ১০ ঘণ্টা (৬০০ মিনিট) ফোকাস স্টাডি সম্পন্ন',
        icon: '🏅',
    },
];

// দ্রুত লুকআপের জন্য Map
const BADGE_MAP = new Map(BADGE_CATALOG.map((b) => [b.badgeKey, b]));

// 🛡️ Helper: ক্যালেন্ডার ডে (YYYY-MM-DD) স্টাডি স্ট্রিক ক্যালকুলেশন
const calculateStudyStreak = (sessionDates) => {
    if (!sessionDates || sessionDates.length === 0) return 0;

    const uniqueDates = [...new Set(sessionDates.map((d) => new Date(d).toISOString().split('T')[0]))]
        .sort()
        .reverse();

    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
        return 0;
    }

    let streak = 0;
    const expectedDate = new Date(uniqueDates[0]);

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

/**
 * 🎯 সেশন বা ভিডিও কমপ্লিটের পর অটোমেটিক ব্যাজ চেক ও অ্যাওয়ার্ড (Idempotent ও Non-blocking)
 * @param {string} userId
 * @param {'SESSION_COMPLETED'|'VIDEO_COMPLETED'} trigger
 * @param {object} context
 */
const checkAndAwardBadges = async (userId, trigger, context = {}) => {
    try {
        // ইউজারের ইতোমধ্যে অর্জিত ব্যাজগুলো ফেচ করা
        const existing = await prisma.achievement.findMany({
            where: { userId },
            select: { badgeKey: true },
        });
        const earnedKeys = new Set(existing.map((a) => a.badgeKey));

        // সব ব্যাজ অর্জিত হয়ে গেলে আর চেক করার দরকার নেই
        if (earnedKeys.size >= BADGE_CATALOG.length) {
            return [];
        }

        const newBadges = [];

        if (trigger === 'SESSION_COMPLETED') {
            const needSessionStats =
                !earnedKeys.has('FIRST_SESSION') ||
                !earnedKeys.has('STREAK_3') ||
                !earnedKeys.has('STREAK_7') ||
                !earnedKeys.has('STREAK_30') ||
                !earnedKeys.has('HOUR_CLUB') ||
                !earnedKeys.has('MARATHON_STUDIER');

            const needFocusMaster = !earnedKeys.has('FOCUS_MASTER');

            const [completedSessions, focusGroups] = await Promise.all([
                needSessionStats
                    ? prisma.session.findMany({
                          where: { userId, status: 'COMPLETED' },
                          select: { completedDuration: true, startTime: true },
                      })
                    : null,
                needFocusMaster
                    ? prisma.attentionScore.groupBy({
                          by: ['sessionId'],
                          where: { session: { userId, status: 'COMPLETED' } },
                          _avg: { score: true },
                      })
                    : null,
            ]);

            if (completedSessions) {
                if (!earnedKeys.has('FIRST_SESSION') && completedSessions.length >= 1) {
                    newBadges.push('FIRST_SESSION');
                }

                const totalFocusMinutes = completedSessions.reduce(
                    (sum, s) => sum + Math.floor((s.completedDuration || 0) / 60),
                    0
                );

                if (!earnedKeys.has('HOUR_CLUB') && totalFocusMinutes >= 60) {
                    newBadges.push('HOUR_CLUB');
                }
                if (!earnedKeys.has('MARATHON_STUDIER') && totalFocusMinutes >= 600) {
                    newBadges.push('MARATHON_STUDIER');
                }

                if (!earnedKeys.has('STREAK_3') || !earnedKeys.has('STREAK_7') || !earnedKeys.has('STREAK_30')) {
                    const streakDays = calculateStudyStreak(completedSessions.map((s) => s.startTime));
                    if (!earnedKeys.has('STREAK_3') && streakDays >= 3) newBadges.push('STREAK_3');
                    if (!earnedKeys.has('STREAK_7') && streakDays >= 7) newBadges.push('STREAK_7');
                    if (!earnedKeys.has('STREAK_30') && streakDays >= 30) newBadges.push('STREAK_30');
                }
            }

            if (
                !earnedKeys.has('PERFECT_FOCUS') &&
                context.avgAttentionScore !== null &&
                context.avgAttentionScore !== undefined &&
                context.avgAttentionScore >= 90
            ) {
                newBadges.push('PERFECT_FOCUS');
            }

            if (focusGroups && !earnedKeys.has('FOCUS_MASTER')) {
                const highFocusSessions = focusGroups.filter(
                    (g) => g._avg.score !== null && g._avg.score >= 80
                ).length;
                if (highFocusSessions >= 5) {
                    newBadges.push('FOCUS_MASTER');
                }
            }
        } else if (trigger === 'VIDEO_COMPLETED') {
            if (!earnedKeys.has('VIDEO_FINISHER')) {
                newBadges.push('VIDEO_FINISHER');
            }

            if (!earnedKeys.has('PLAYLIST_MASTER') && context.playlistId) {
                const [totalVideos, incompleteVideos] = await Promise.all([
                    prisma.video.count({ where: { playlistId: context.playlistId } }),
                    prisma.video.count({ where: { playlistId: context.playlistId, isCompleted: false } }),
                ]);

                if (totalVideos > 0 && incompleteVideos === 0) {
                    newBadges.push('PLAYLIST_MASTER');
                }
            }
        }

        if (newBadges.length > 0) {
            await prisma.achievement.createMany({
                data: newBadges.map((badgeKey) => ({ userId, badgeKey })),
                skipDuplicates: true,
            });
        }

        return newBadges;
    } catch (error) {
        console.error('⚠️ Achievement check error:', error.message);
        return [];
    }
};

module.exports = {
    BADGE_CATALOG,
    BADGE_MAP,
    calculateStudyStreak,
    checkAndAwardBadges,
};
