# AI Interview Preparation System

A full-stack MVP for automated, AI-driven behavioral and technical mock interviews using open-weight and accessible models (DeepSeek-R1, Llama 3 8B, Mistral 7B, Whisper).

## 🚀 Key Features
- **Resume & JD Processing**: Llama 3 parses your unstructured inputs into a match score.
- **Dynamic Questions**: DeepSeek-R1 formulates context-aware questions based on gaps.
- **Voice Answers**: Native browser Web Audio API -> captured and passed to Whisper STT.
- **Audited Scoring**: DeepSeek-R1 evaluates your transcription and scores tech, relevance, depth, etc. Mistral 7B acts as a "Judge AI" monitoring the evaluation for fairness.
- **Analytics Dashboard**: Tracks score metrics and progression across mock sessions.

---

## 🏗️ Architecture Stack
- **Frontend**: React, Vite, Tailwind CSS V4, Lucide React
- **Backend**: Node.js, Express, Axios, Multer, JWT
- **Database**: MongoDB (Prisma ORM)
- **Container**: `docker-compose` included for DB setup

---

## 🛠️ Environment Setup

Create `.env` in `backend/`:

```env
PORT=5000
DATABASE_URL="mongodb://admin:password123@localhost:27017/interview_db?authSource=admin"
JWT_SECRET="your_super_secret_key_here"

# Free LLM Proxy or Hub (e.g., Groq, Together, Hugging Face)
LLM_API_KEY="your_api_key_here"
LLM_BASE_URL="https://api.groq.com/openai/v1"

# Specific Models
LLM_MODEL_EXTRACTION="llama3-8b-8192"
LLM_MODEL_REASONING="deepseek-r1-distill-llama-70b" 
LLM_MODEL_JUDGE="mixtral-8x7b-32768"

WHISPER_API_KEY="your_api_key_here"
WHISPER_BASE_URL="https://api.groq.com/openai/v1/audio/transcriptions"
WHISPER_MODEL="whisper-large-v3"
```

---

## 📦 Deployment & Run Guide

### 1. Start Database
```bash
docker-compose up -d
```

### 2. Setup Backend
```bash
cd backend
npm install
npx prisma db push
npm run dev # or node src/server.js
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173`.

---

## 📖 API Documentation

### Auth Routes
- `POST /api/auth/register` (body: email, name, password)
- `POST /api/auth/login` (body: email, password)

### Interview Session Routes
- `POST /api/interview/start` - `multipart/form-data`
  - Needs Auth header.
  - Fields: `resume` (file), `jobRole` (text), `jdText` (text).
- `POST /api/interview/:sessionId/question`
  - Evaluates previous questions and returns the next DeepSeek generated question.
- `POST /api/interview/:sessionId/answer/:questionId` - `multipart/form-data`
  - Fields: `audio` (webm/mp3 file)
  - Returns: Transcript, Feedback Scores, and Mistral Judge Audit.

### Analytics Routes
- `GET /api/analytics/dashboard`
  - Returns user metrics and progression trend.
