# AI Interview Prep Backend

Express + MongoDB backend for the AI Interview Preparation frontend.

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT auth
- Redis + BullMQ background workers for answer evaluation
- Pluggable file storage (local disk or S3-compatible object storage)
- WebSocket (`ws`) for interview realtime events

## Setup

1. Install dependencies:

```bash
cd backend
npm install
```

2. Start infrastructure dependencies:

```bash
docker compose -f ../docker-compose.prod.yml up mongo redis -d
```

3. Configure environment:

```bash
cp .env.example .env
```

4. Run the API:

```bash
npm run dev
```

5. Run the background worker in a second terminal when `EVALUATION_MODE=redis`:

```bash
npm run start:worker
```

Backend starts on `http://localhost:5000`, WebSocket at `ws://localhost:5000/ws/interview/:sessionId`, and health probes at `/health/live` and `/health/ready`.

## Scaling Notes

- The API remains stateless with JWT auth. No in-memory session store is required for horizontal scaling.
- Interview answer evaluation now runs through a Redis-backed BullMQ queue so heavy scoring work is off the main event loop.
- Mongo connection pooling is configurable through `MONGO_MAX_POOL_SIZE` and related env vars for multi-pod deployments.
- Resume/audio uploads can stay local for development or move to S3-compatible storage by setting `STORAGE_DRIVER=s3`.
- To bypass API memory pressure for larger uploads, enable direct browser uploads with `DIRECT_UPLOADS_ENABLED=true`. The backend will issue presigned S3 URLs and only finalize metadata after the object lands in storage.

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
- `POST /api/resume/upload-url`
- `POST /api/resume/upload-complete`
- `POST /api/resume/upload`
- `PUT /api/resume/skills`
- `POST /api/interview/session`
- `GET /api/interview/session/:sessionId/question?index=0`
- `POST /api/interview/session/:sessionId/answer-upload-url`
- `POST /api/interview/session/:sessionId/answer-complete`
- `POST /api/interview/session/:sessionId/answer`
- `POST /api/interview/session/:sessionId/end`
- `GET /api/interview/session/:sessionId/results`
- `GET /api/interview/session/:sessionId/review`
- `GET /api/analytics`
- `PUT /api/settings/profile`
- `PUT /api/settings/password`
- `DELETE /api/settings/account`
- `GET /health/live`
- `GET /health/ready`

## Deployment Artifacts

- Production Docker images: [backend/Dockerfile](/D:/interviewprep/backend/Dockerfile), [frontend/Dockerfile](/D:/interviewprep/frontend/Dockerfile)
- Local production stack: [docker-compose.prod.yml](/D:/interviewprep/docker-compose.prod.yml)
- Kubernetes manifests: [k8s/backend-api.yaml](/D:/interviewprep/k8s/backend-api.yaml), [k8s/backend-worker.yaml](/D:/interviewprep/k8s/backend-worker.yaml), [k8s/frontend.yaml](/D:/interviewprep/k8s/frontend.yaml), [k8s/ingress.yaml](/D:/interviewprep/k8s/ingress.yaml)
- Queue autoscaling: [k8s/backend-worker-keda.yaml](/D:/interviewprep/k8s/backend-worker-keda.yaml)
- HA Redis example values for Helm-based deployment: [k8s/redis-ha-values.example.yaml](/D:/interviewprep/k8s/redis-ha-values.example.yaml)
