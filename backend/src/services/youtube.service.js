const https = require('https');

// ── 📊 Quota Tracker State (অ্যাডমিনের জন্য কোটা ট্র্যাকিং স্টেট) ──────────────
const quotaTracker = {
    estimatedUnitsUsedToday: 0,
    dailyLimit: 10000,
    lastResetDate: new Date().toISOString().split('T')[0], // প্রতিদিনের ডেট ট্র্যাকিং
    isQuotaExhausted: false,
    lastQuotaExceededAt: null,
    fallbackTriggeredCount: 0,
    totalImportsOfficial: 0,
    totalImportsFallback: 0,
};

// ── Helper: নতুন দিনে কোটা কাউন্টার রিসেট করা ──────────────────────────────────
const checkAndResetDailyQuota = () => {
    const today = new Date().toISOString().split('T')[0];
    if (quotaTracker.lastResetDate !== today) {
        quotaTracker.estimatedUnitsUsedToday = 0;
        quotaTracker.isQuotaExhausted = false;
        quotaTracker.lastResetDate = today;
    }
};

// ── Helper: অ্যাডমিন যাতে কোটা ও সিস্টেম স্ট্যাটাস দেখতে পারে ─────────────────
exports.getQuotaStatus = () => {
    checkAndResetDailyQuota();
    const apiKeyConfigured = !!process.env.YOUTUBE_API_KEY;

    let activeMode = 'youtube-sr (Zero-Config)';
    let status = 'NO_API_KEY';

    if (apiKeyConfigured) {
        if (quotaTracker.isQuotaExhausted) {
            status = 'QUOTA_EXHAUSTED_FALLBACK_ACTIVE';
            activeMode = 'youtube-sr (Fallback)';
        } else {
            status = 'OPERATIONAL';
            activeMode = 'youtube-api-v3 (Official)';
        }
    }

    return {
        hasApiKey: apiKeyConfigured,
        status,
        activeMode,
        dailyLimit: quotaTracker.dailyLimit,
        estimatedUnitsUsedToday: quotaTracker.estimatedUnitsUsedToday,
        remainingEstimatedUnits: Math.max(0, quotaTracker.dailyLimit - quotaTracker.estimatedUnitsUsedToday),
        isQuotaExhausted: quotaTracker.isQuotaExhausted,
        lastQuotaExceededAt: quotaTracker.lastQuotaExceededAt,
        fallbackTriggeredCount: quotaTracker.fallbackTriggeredCount,
        stats: {
            totalImportsOfficial: quotaTracker.totalImportsOfficial,
            totalImportsFallback: quotaTracker.totalImportsFallback,
            totalImports: quotaTracker.totalImportsOfficial + quotaTracker.totalImportsFallback,
        },
    };
};

// ── Helper: HTTPS GET → JSON ──────────────────────────────────────────────────
const httpsGet = (url) =>
    new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        const msg = parsed.error.message || 'YouTube API error.';
                        reject(new Error(`YouTube API: ${msg}`));
                    } else {
                        resolve(parsed);
                    }
                } catch {
                    reject(new Error('Failed to parse YouTube API response.'));
                }
            });
        }).on('error', reject);
    });

// ── Helper: Extract playlist ID from URL or raw ID ───────────────────────────
const extractPlaylistId = (input) => {
    if (!input) return null;
    const trimmed = input.trim();
    if (!trimmed.includes('http')) return trimmed; // Raw playlist ID
    try {
        const url = new URL(trimmed);
        return url.searchParams.get('list');
    } catch {
        return null;
    }
};

// ── Helper: ISO 8601 duration → readable string (PT5M30S → "5:30") ──────────
const parseDuration = (iso) => {
    if (!iso) return null;
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return null;
    const h = parseInt(match[1] || 0);
    const m = parseInt(match[2] || 0);
    const s = parseInt(match[3] || 0);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
};

// ── Method 1: Official YouTube Data API v3 ───────────────────────────────────
const fetchViaOfficialAPI = async (playlistId, apiKey) => {
    const MAX_VIDEOS = 200;
    let videos = [];
    let nextPageToken = null;

    // 1. Get playlist title
    const playlistInfo = await httpsGet(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
    );
    if (!playlistInfo.items || playlistInfo.items.length === 0) {
        throw new Error('Playlist not found or is private.');
    }
    const playlistTitle = playlistInfo.items[0].snippet.title;

    // 2. Get all playlist items (paginated, 50 per page)
    do {
        const pageParam = nextPageToken ? `&pageToken=${nextPageToken}` : '';
        const itemsData = await httpsGet(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50${pageParam}&key=${apiKey}`
        );

        const pageVideos = (itemsData.items || [])
            .filter((item) => item.snippet.resourceId.kind === 'youtube#video')
            .map((item) => ({
                id: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                thumbnail:
                    item.snippet.thumbnails?.medium?.url ||
                    `https://img.youtube.com/vi/${item.snippet.resourceId.videoId}/mqdefault.jpg`,
            }));

        videos.push(...pageVideos);
        nextPageToken = itemsData.nextPageToken || null;
    } while (nextPageToken && videos.length < MAX_VIDEOS);

    videos = videos.slice(0, MAX_VIDEOS);

    // 3. Fetch durations for all videos (50 at a time)
    const durationMap = {};
    for (let i = 0; i < videos.length; i += 50) {
        const chunk = videos
            .slice(i, i + 50)
            .map((v) => v.id)
            .join(',');
        const detailsData = await httpsGet(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${chunk}&key=${apiKey}`
        );
        (detailsData.items || []).forEach((item) => {
            durationMap[item.id] = parseDuration(item.contentDetails.duration);
        });
    }

    // 📊 কোটা হিসাব: ১ (প্লেলিস্ট তথ্য) + পেজ সংখ্যা (ভিডিও লিস্ট) + ডিউরেশন কল
    const pagesCount = Math.ceil(videos.length / 50) || 1;
    const durationCallsCount = Math.ceil(videos.length / 50) || 1;
    const unitsConsumed = 1 + pagesCount + durationCallsCount; // সাধারণত ~৩-৫ ইউনিট

    quotaTracker.estimatedUnitsUsedToday += unitsConsumed;
    quotaTracker.totalImportsOfficial += 1;

    return {
        playlistTitle,
        source: 'youtube-api-v3',
        videos: videos.map((v) => ({
            id: v.id,
            title: v.title,
            thumbnail: v.thumbnail,
            duration: durationMap[v.id] || null,
            kind: 'youtube#video',
        })),
    };
};

// ── Method 2: Zero-Config via youtube-sr ─────────────────────────────────────
const fetchViaYoutubeSR = async (playlistId) => {
    let YouTube;
    try {
        YouTube = require('youtube-sr').default;
    } catch {
        throw new Error(
            'youtube-sr package not found. Run: npm install youtube-sr'
        );
    }

    const playlist = await YouTube.getPlaylist(playlistId, { fetchAll: true });
    if (!playlist) throw new Error('Playlist not found or is private.');

    // 📊 ফলব্যাক ইমপোর্ট কাউন্টার আপডেট
    quotaTracker.totalImportsFallback += 1;

    return {
        playlistTitle: playlist.title,
        source: 'youtube-sr',
        videos: playlist.videos.slice(0, 200).map((v) => ({
            id: v.id,
            title: v.title,
            thumbnail:
                v.thumbnail?.url ||
                `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
            duration: v.duration_raw || null,
            kind: 'youtube#video',
        })),
    };
};

// ── Main Export: Hybrid Fetcher ───────────────────────────────────────────────
// Uses Official API if YOUTUBE_API_KEY is set.
// If API quota exceeds or fails, automatically falls back to youtube-sr.
exports.fetchPlaylist = async (urlOrId) => {
    const playlistId = extractPlaylistId(urlOrId);
    if (!playlistId) {
        throw new Error(
            'Invalid YouTube playlist URL or ID. Example: https://www.youtube.com/playlist?list=PL...'
        );
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey && !quotaTracker.isQuotaExhausted) {
        try {
            return await fetchViaOfficialAPI(playlistId, apiKey);
        } catch (error) {
            console.warn(`⚠️ Official YouTube API failed (${error.message}). Falling back to zero-config scraper...`);

            // 🚨 কোটা ফুরিয়ে গেলে ফ্ল্যাগ সক্রিয় করা এবং টাইমস্ট্যাম্প রেকর্ড করা
            if (error.message.includes('quota') || error.message.includes('quotaExceeded')) {
                quotaTracker.isQuotaExhausted = true;
                quotaTracker.lastQuotaExceededAt = new Date().toISOString();
                quotaTracker.estimatedUnitsUsedToday = quotaTracker.dailyLimit; // কোটা ফুল মার্ক করা
                console.error('🚨 [ADMIN ALERT] YouTube Data API Daily Quota Exceeded! Fallback mode is now ACTIVE.');
            }

            quotaTracker.fallbackTriggeredCount += 1;
            // কোটা ফুরিয়ে গেলে বা অন্য কোনো সমস্যা হলে অটো-ফলব্যাক
            return await fetchViaYoutubeSR(playlistId);
        }
    }
    return await fetchViaYoutubeSR(playlistId);
};

exports.extractPlaylistId = extractPlaylistId;
