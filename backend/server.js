require('dotenv').config();
const app = require('./src/app');
const prisma = require('./src/config/db');

const PORT = process.env.PORT || 8081;

async function startServer() {
    try {
        // Database connection verify
        await prisma.$connect();
        console.log('✅ Connected to PostgreSQL Database via Prisma');

        app.listen(PORT, () => {
            console.log(`🚀 Server is listening at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to connect to the database:', error);
        process.exit(1);
    }
}

startServer();