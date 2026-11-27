const { PrismaClient } = require('@prisma/client');

// Reuse a single PrismaClient instance and avoid verbose per-query stdout overhead
const prisma =
    globalThis.__prisma ||
    new PrismaClient({
        log:
            process.env.PRISMA_LOG_QUERIES === 'true'
                ? ['query', 'warn', 'error']
                : ['warn', 'error'],
    });

if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma;
}

module.exports = prisma;
