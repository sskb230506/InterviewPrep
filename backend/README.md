# AI Interview Prep Backend

Express + MongoDB backend for the AI Interview Preparation frontend.

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT auth
- Multer file uploads (resume/audio)
- WebSocket (`ws`) for interview realtime events

## Setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Start MongoDB locally (or update `MONGO_URI` in `.env`).

4. Run backend:

```bash
npm run dev
```

Backend starts on `http://localhost:5000` and WebSocket at `ws://localhost:5000/ws/interview/:sessionId`.

## Frontend Integration

Set frontend env (`/Users/krishnasubhahshbusanaboina/Documents/intervuewPrep/.env`):

```bash
VITE_API_BASE_URL=http://localhost:5000/api
VITE_WS_BASE_URL=ws://localhost:5000/ws
VITE_USE_MOCK=false
```

Then start frontend from project root:

```bash
npm run dev
```

## API Endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `POST /api/resume/upload`
- `PUT /api/resume/skills`
- `POST /api/interview/session`
- `GET /api/interview/session/:sessionId/question?index=0`
- `POST /api/interview/session/:sessionId/answer`
- `POST /api/interview/session/:sessionId/end`
- `GET /api/interview/session/:sessionId/results`
- `GET /api/interview/session/:sessionId/review`
- `GET /api/analytics`
- `PUT /api/settings/profile`
- `PUT /api/settings/password`
- `DELETE /api/settings/account`
