

```markdown
# CogneLearn Backend API

A high-performance REST API backend built with **Node.js**, **Express**, **Prisma ORM**, and **PostgreSQL (Neon Serverless)** for the CogneLearn platform.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- PostgreSQL database instance (local or [Neon.tech](https://neon.tech))

---

## 🛠️ Installation & Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Ensure your `.env` file in the `backend/` directory is configured:
   ```env
   PORT=5000
   NODE_ENV=development
   DATABASE_URL="your_postgresql_connection_string"
   JWT_SECRET="your_jwt_secret_key"
   JWT_EXPIRES_IN="7d"
   ```

4. **Generate Prisma Client & Apply Migrations:**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

---

## 🏃‍♂️ Running the Server

### Development Mode (with automatic reload via nodemon):
```bash
npm run dev
npm run dev -- --hot-reload
```

### Production Mode:
```bash
npm start
```

---

## 🔍 Database Management & Health Check

- **Launch Prisma Studio (Web GUI for Database):**
  ```bash
  npx prisma studio
  ```
  *Opens an interactive visual database browser at `http://localhost:5555` to view and edit tables.*

- **Health Check Endpoint:**
  Verify if the backend service is active:
  ```http
  GET http://localhost:5000/health
  ```
  Expected Response:
  ```json
  {
    "status": "UP",
    "message": "CogneLearn API Server is running"
  }
  ```

---

## 🔐 API Endpoints (Phase 2 - Authentication)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | Register a new user | ❌ Public |
| `POST` | `/api/v1/auth/login` | Login and receive JWT token | ❌ Public |
| `GET` | `/api/v1/auth/me` | Retrieve authenticated user profile | ✅ Bearer Token |
| `GET` | `/api/v1/users/me` | Alias for current user profile | ✅ Bearer Token |
| `GET` | `/health` | Server status check | ❌ Public |
```

---
