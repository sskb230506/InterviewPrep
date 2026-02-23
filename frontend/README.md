# AI Interview Preparation Platform

Full-stack app with:

- Frontend: React + Vite (`/`)
- Backend: Node.js + Express + MongoDB (`/backend`)
- Realtime events: WebSocket (`ws://localhost:5000/ws/interview/:sessionId`)

## 1. Start MongoDB

### Option A: Docker (recommended)

```bash
docker compose up -d mongo
```

### Option B: Local MongoDB service

Run your local MongoDB server on `127.0.0.1:27017`.

## 2. Start Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend URL: `http://localhost:5000`

## 3. Start Frontend

From project root:

```bash
cp .env.example .env
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Frontend Env

`/Users/krishnasubhahshbusanaboina/Documents/intervuewPrep/.env`

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_WS_BASE_URL=ws://localhost:5000/ws
VITE_USE_MOCK=false
```

## Backend Env

`/Users/krishnasubhahshbusanaboina/Documents/intervuewPrep/backend/.env`

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/ai_interview_prep
JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
UPLOAD_DIR=uploads
```

## Useful Commands

From project root:

```bash
npm run frontend:dev
npm run backend:dev
npm run build
```
