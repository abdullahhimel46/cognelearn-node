require('dotenv').config();
const app = require('./src/app');
const prisma = require('./src/config/db');

const PORT = process.env.PORT || 8081;
const KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 mins (under Neon's 5-min auto-suspend)
const IDLE_CUTOFF_MS = 30 * 60 * 1000;        // Stop pinging after 30 mins of inactivity

async function startServer() {
    try {
        const start = Date.now();
        // Pre-warm Neon compute and all 4 pool connections in parallel at startup
        await Promise.all([
            prisma.$queryRawUnsafe('SELECT 1'),
            prisma.$queryRawUnsafe('SELECT 1'),
            prisma.$queryRawUnsafe('SELECT 1'),
            prisma.$queryRawUnsafe('SELECT 1'),
        ]);
        globalThis.__dbLastActivityAt = Date.now();
        console.log(`✅ Connected & pre-warmed Neon PostgreSQL in ${Date.now() - start}ms`);

        // Keep Neon warm while actively developing so queries don't hit 3s cold starts
        if (process.env.NODE_ENV !== 'production') {
            const timer = setInterval(async () => {
                const idleMs = Date.now() - (globalThis.__dbLastActivityAt || 0);
                if (idleMs > IDLE_CUTOFF_MS) return;
                try {
                    await prisma.$queryRawUnsafe('SELECT 1');
                } catch {
                    // Non-fatal; pool reconnects on the next real query
                }
            }, KEEP_ALIVE_INTERVAL_MS);
            timer.unref();
        }

        app.listen(PORT, () => {
            console.log(`🚀 Server is listening at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to connect to the database:', error);
        process.exit(1);
    }
}

startServer();
