# Streamlytics — Real-Time Streaming Analytics Platform
Streamlytics is a full-stack real-time data analytics platform that supports dataset ingestion, streaming processing, and AI-powered insights using Gemini. The system is designed with a distributed architecture using FastAPI, Redis Streams, Cloud Run, Cloud SQL, and Firebase Hosting.

## Branch Structure
- main branch → Production deployment on Google Cloud Platform (GCP)
- hsiangling/local branch → Local development environment

## Local Development Setup(hsiangling/local)
1. Backend Setup
```
pip install -r requirements.txt
```
2. Configure Environment Variables
- Copy `.env.sample → .env`
- Fill in required values:
```
SECRET_KEY=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
```
3. Run Backend API
```
uvicorn app_backend.main:app --reload
```
4. Run worker.py
```
python -m app_backend.workers.worker
```
6. Run Frontend
```
cd Streamlytics
npm install
npm run dev
```

## GCP Deployment(main branch)
### Backend (Cloud Run)
- FastAPI container deployed to Cloud Run
- Environment variables configured via Cloud Run settings
- Connected to Cloud SQL (PostgreSQL)
- Redis Streams used for async processing
### Worker
- Deployed as Cloud Run service/job
- Consumes events from Redis Streams
- Calls Gemini API for AI analysis
### Frontend
- Built using Vite
- Deployed via Firebase Hosting
---

1. Configure Environment Variables: Create and configure `.env.yaml`
2. Build Docker image:
```
gcloud builds submit --config backend/image.yaml
```
3. Deploy Backend API:
```
gcloud run deploy streamlytics-api \
  --image us-central1-docker.pkg.dev/[project name]/streamlytics/api-service \   
  --region us-central1 \
  --allow-unauthenticated \
  --env-vars-file .env.yaml  
```
4. Deploy Worker Service:
```
gcloud run jobs deploy streamlytics-worker \                                                                                    
  --image us-central1-docker.pkg.dev/streamlytics-494320/streamlytics/worker-service \
  --region us-central1 \
  --env-vars-file .env.yaml \
  --max-retries 3 \
  --task-timeout 3600
```
5. Create Cloud SQL Database(using `app_backend/db/schema.sql`)
6. Create Redis instance:
```
gcloud redis instances create streamlytics-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --network=default
```
7. Deploy Frontend:
```
npm install -g firebase-tools
firebase login
firebase init
npm run build
firebase deploy
```
## Tech
- Frontend: React + Vite
- Backend: FastAPI (Cloud Run)
- Worker: Python (Cloud Run Jobs)
- Database: Cloud SQL (PostgreSQL)
- Messaging: Redis Streams
- AI: Gemini 2.5 Flash Lite
- Hosting: Firebase Hosting

