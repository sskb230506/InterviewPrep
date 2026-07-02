# AI Interview Preparation Platform

A production-grade, full-stack platform for automated, AI-driven behavioral and technical mock interviews. The system analyzes candidate resumes and job descriptions (JDs), generates dynamic questions tailored to target roles or resume gaps, transcribes candidate audio responses, scores performance across technical/behavioral dimensions, and provides an audited evaluation.

---

## 🏗️ Architecture & System Topology

The platform is designed with a **decoupled, event-driven architecture** using separate processes for the web API and background worker tasks to keep the user-facing server fast and non-blocking. 

### Architectural Flow

```
                  +-------------------------------------------------+
                  |                  React Frontend                 |
                  |     (Vite + Tailwind CSS + Web Audio API)       |
                  +-------+---------------------------------+-------+
                          |                                 ^
             HTTPS        |                                 | WebSockets
             Rest APIs    |                                 | (Real-time events)
                          v                                 |
                  +-------+---------------------------------+-------+
                  |                    API Server                   |
                  |                (Express.js Process)             |
                  +---+------------------+------------------+-------+
                      |                  |                  ^
         Mongoose DB  |                  | Push Job         | Redis Pub/Sub
         Operations   |                  | (BullMQ)         | Subscription
                      v                  v                  |
              +-------+-------+  +-------+-------+  +-------+-------+
              |               |  |  BullMQ Queue |  | Redis Pub/Sub |
              |    MongoDB    |  |   "interview- |  |   "interview- |
              |               |  |  evaluation"  |  |    events"    |
              +-------^-------+  +-------+-------+  +-------^-------+
                      |                  |                  |
         Mongoose DB  |                  | Pull Job         | Publish Event
         Operations   |                  v                  |
                      |          +-------+-------+          |
                      +----------+ BullMQ Worker +----------+
                                 |  (Worker.js)  |
                                 +-------+-------+
                                         |
                                         | REST API Calls
                                         v
                            +------------+------------+
                            |     Groq AI Services    |
                            |                         |
                            | - Whisper (STT)         |
                            | - DeepSeek-R1 (Reason)  |
                            | - Llama-3 (Extract)     |
                            | - Mixtral (Judge AI)    |
                            +-------------------------+
```

### Decoupled Core Components

1. **Vite React Frontend**:
   - Manages candidate authentication, settings, dashboards, and live interview rooms.
   - Captures candidate voice responses using the native browser **Web Audio API** and posts them as WebM/MP3 data.
   - Connects to the API Server via **WebSockets** to receive immediate, push-based updates during processing.

2. **Express API Server (Stateless)**:
   - Exposes REST endpoints for user accounts, resume uploads, session management, and dashboard analytics.
   - Operates statelessly for easy horizontal scaling; JWT validation eliminates local session state.
   - Hands off heavy audio transcription and LLM evaluation workloads to the queue using **BullMQ**.
   - Listens to a Redis Pub/Sub channel and acts as a **WebSocket Relay**, forwarding real-time status updates (`answer_queued`, `answer_processed`, `session_completed`) to the corresponding client.

3. **Background BullMQ Worker (Stateful Processor)**:
   - Runs as an independent process (`node src/worker.js`) to consume jobs concurrently.
   - Orchestrates the Whisper & LLM scoring pipeline:
     1. Downloads/reads candidate audio from storage.
     2. Calls **Whisper STT** for low-latency audio-to-text transcription.
     3. Feeds question/context/transcript into **DeepSeek-R1** to score performance.
     4. Audits the raw evaluation via **Mixtral** (acting as a Judge LLM) to enforce reliability.
   - Saves final evaluation scores and feedback back to **MongoDB** using Mongoose.
   - Publishes processing events to the Redis Pub/Sub channel.

4. **Redis Data Store**:
   - Acts as the background database for **BullMQ** to track jobs, retries, and worker concurrency.
   - Hosts the Pub/Sub messaging topology for real-time inter-process communications.

5. **Flexible Storage Driver**:
   - Supports pluggable storage backends (Local Disk or AWS S3).
   - In production, can bypass the API server entirely using **Direct Browser Uploads** via presigned S3 URLs to reduce memory pressure.

---

## 🤖 Multi-Model LLM Orchestration

The system orchestrates specialized models via **Groq**'s high-speed inference engine to solve different aspects of the pipeline:

| Model | Purpose | Justification |
| :--- | :--- | :--- |
| **`whisper-large-v3`** | Audio Transcription | Transcribes multi-dialect candidate answers into text with high temporal fidelity. |
| **`llama-3.1-8b-instant`** | Resume & JD Extraction | High speed and JSON conformity when parsing unstructured resumes/JDs into structured entities. |
| **`llama-3.3-70b-versatile` / `deepseek-r1`** | Core Reasoning & Evaluation | Deep reasoning capabilities used to formulate domain-specific questions and evaluate answers. |
| **`mixtral-8x7b-32768` / `llama-3.1-8b-instant`** | Evaluation Guard/Audit | Secondary "Judge LLM" validating the evaluation output for consistency and preventing hallucinated scores. |

---

## ⚡ Key Features

- **Resilient Evaluation Queue**: Offloads CPU-intensive STT/LLM tasks to dedicated worker processes so HTTP endpoints remain responsive.
- **WebSocket Streaming Feedback**: Shows progressive evaluation feedback (clarity, confidence, grammar, core tech concepts) as soon as it's computed.
- **Direct S3 Upload Support**: Generates secure pre-signed URLs to upload large audio files directly to S3-compliant storage.
- **Resume-to-Question Generation**: Auto-extracts developer skills from PDF/DOCX and aligns them with target Job Descriptions.
- **Audited Scoring System**: Implements a two-pass LLM pipeline (Evaluator + Judge) to guarantee meaningful, non-random evaluations.

---

## 🛠️ Environment Configuration

Create a `.env` file in the `backend/` directory or root depending on the deploy mode (see `.env.example` in root for reference).

### Core Service Settings
* `PORT`: Port the API server listens on (default: `5000`).
* `MONGO_URI`: Connection string for MongoDB (e.g., `mongodb://127.0.0.1:27017/ai_interview_prep`).
* `JWT_SECRET`: Secret key for JWT auth generation.
* `CLIENT_ORIGIN`: Allowed CORS origins (e.g., `http://localhost:5173`).
* `EVALUATION_MODE`: Either `redis` (multi-process worker) or `inline` (runs evaluation synchronously in API server).

### Redis & Queue Settings (when `EVALUATION_MODE=redis`)
* `REDIS_URL`: Redis server URL (e.g., `redis://127.0.0.1:6379`).
* `INTERVIEW_EVALUATION_QUEUE`: Name of the BullMQ task queue (default: `interview-answer-evaluations`).
* `INTERVIEW_EVALUATION_CONCURRENCY`: Parallel jobs processed per worker instance (default: `4`).

### Storage Settings
* `STORAGE_DRIVER`: Pluggable storage driver (`local` or `s3`).
* `UPLOAD_DIR`: Directory for local storage uploads (default: `uploads`).
* `DIRECT_UPLOADS_ENABLED`: Set to `true` to enable direct browser uploads to S3.
* `S3_BUCKET`, `AWS_REGION`, `S3_ENDPOINT`: AWS/S3 compatible storage target parameters.

### AI Model Provider Configuration (Groq API)
* `LLM_API_KEY`: API key for Groq LLMs.
* `LLM_BASE_URL`: Base URL (default: `https://api.groq.com/openai/v1`).
* `LLM_MODEL_EXTRACTION`: Parsing model (e.g., `llama-3.1-8b-instant`).
* `LLM_MODEL_REASONING`: Evaluation/Reasoning model (e.g., `llama-3.3-70b-versatile`).
* `LLM_MODEL_JUDGE`: Auditor model (e.g., `llama-3.1-8b-instant`).
* `WHISPER_API_KEY`: API key for transcription.
* `WHISPER_BASE_URL`: API Endpoint for Whisper.
* `WHISPER_MODEL`: Speech-to-text model (e.g., `whisper-large-v3`).

---

## 📦 Run and Deployment Guide

### Option 1: Run Full Production Stack with Docker Compose (Recommended)

1. Create a `.env` in the root directory (based on `.env.example`).
2. Start the services:
   ```bash
   docker compose -f docker-compose.prod.yml up --build -d
   ```
   This will spin up:
   - **Frontend**: Nginx serving React client on `http://localhost:8080`
   - **API Server**: Express API listening on `http://localhost:5000`
   - **Worker**: Concurrently executing evaluations from BullMQ
   - **MongoDB & Redis**: Databases and messaging servers

### Option 2: Local Development Setup

To run locally without Docker containers for Node:

#### 1. Spin up Databases (MongoDB & Redis)
Ensure MongoDB (configured as a replica set) and Redis are running locally. You can use the development `docker-compose.yml` to start MongoDB:
```bash
docker compose up -d
```

#### 2. Run the API Server
```bash
cd backend
npm install
npm run dev
```

#### 3. Run the Background Worker (In a separate terminal)
Make sure `EVALUATION_MODE=redis` is set in your `backend/.env`.
```bash
cd backend
npm run start:worker
```

#### 4. Run the React Frontend
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` to interact with the web app.

---

## 📖 Key API Routes

### Authentication
* `POST /api/auth/signup` - Register a new account.
* `POST /api/auth/login` - Authenticate and obtain JWT.
* `GET /api/auth/me` - Fetch authenticated user details.

### Resume & Skills Profile
* `POST /api/resume/upload` - Upload resume (PDF/DOCX) to parse skills.
* `PUT /api/resume/skills` - Modify/manually set parsed skills.

### Interview Session
* `POST /api/interview/session` - Create interview session for a job role and JD.
* `GET /api/interview/session/:sessionId/question` - Fetch next dynamically generated question.
* `POST /api/interview/session/:sessionId/answer` - Submit voice answer buffer (Multipart file).
* `POST /api/interview/session/:sessionId/answer-upload-url` - Request S3 direct upload target.
* `POST /api/interview/session/:sessionId/answer-complete` - Confirm direct S3 upload completion and trigger evaluation.
* `POST /api/interview/session/:sessionId/end` - Stop interview and mark session as ending (triggers final summary).
* `GET /api/interview/session/:sessionId/results` - Get overall evaluation summary scores.

### Analytics & Settings
* `GET /api/analytics` - Fetch user historical performance and progression metrics.
* `PUT /api/settings/profile` - Update profile data.

---

## ☸️ Cloud / Kubernetes Scaling

The architecture is built to be cloud-native:
- **HPA & KEDA Integration**: Kubernetes manifests (`/k8s`) contain a KEDA (`ScaledObject`) template that auto-scales the `backend-worker` deployment based on the queue depth of the `interview-answer-evaluations` queue in Redis.
- **State Separation**: Since the web servers are stateless, traffic scales horizontally behind an Ingress Controller, while workers scale independently to handle spikes in audio processing demand without degrading web request performance.
