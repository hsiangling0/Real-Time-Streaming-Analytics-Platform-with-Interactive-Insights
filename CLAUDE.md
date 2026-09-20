# CLAUDE.md — Streamlytics

Context file for AI coding assistants working on this repository. The repository code is the source of truth for implementation. The cloud deployment section reflects the currently verified GCP environment.

## 1. Project Overview

Streamlytics is a real-time streaming analytics platform. Users authenticate, ingest data (market data via yfinance/CoinGecko or their own CSV uploads), view live-updating charts, and ask natural-language questions about their datasets that are answered by Gemini.

- Frontend: React + Vite
- Backend API: FastAPI
- Async processing: Redis Streams + a Python worker using consumer groups
- Database: PostgreSQL
- File storage: local disk for local development / Google Cloud Storage for cloud deployment
- AI analysis: Gemini API
- Market data: yfinance for stocks and CoinGecko for crypto

## 2. Architecture and Major Components

| Component                                    | Responsibility                                                                                                                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend** (`Streamlytics/`)               | Login/register, dashboard with live charts, CSV upload, market-data ingestion, and AI analysis UI                                                                                                                |
| **Backend API** (`app_backend/main.py`)      | Authentication (register/login/JWT), `/upload`, `/ingest`, `/analyze`, `/datalist`, and WebSocket endpoints for live chart data and analysis results                                                             |
| **Worker** (`app_backend/workers/worker.py`) | Long-running Redis Streams consumer; fetches market data or parses CSVs, writes datapoints to per-dataset Redis streams, builds prompts and calls Gemini for analysis, and writes analysis results to PostgreSQL |
| **PostgreSQL**                               | Stores `organizations`, `users`, `datasets`, and `analysis_results` tables defined in `app_backend/db/schema.sql`                                                                                                |
| **Redis**                                    | Job queue through `stream:jobs` and `stream:analysis`, plus live per-dataset data streams such as `stream:{dataset_id}`                                                                                          |
| **Object storage**                           | CSV uploads: local disk in development, Google Cloud Storage in production                                                                                                                                       |
| **Docker** (`docker/`)                       | Separate Docker images for the API and worker                                                                                                                                                                    |

The API and worker are **decoupled**. They do not call each other directly. Communication between them is handled through Redis Streams.

## 3. Data Flow

### Authentication

Login/Register → FastAPI API → JWT containing authentication information including `org_id` → frontend stores the token → subsequent API requests send `Authorization: Bearer <token>`.

### Market Data Ingestion

Frontend → `POST /ingest` → API creates a `datasets` row and pushes a job to `stream:jobs` → worker fetches data from yfinance or CoinGecko → worker writes datapoints to `stream:{dataset_id}` → frontend connects to `WS /ws/{dataset_id}` → API reads the Redis stream and sends data to the client → chart renders the data.

### CSV Ingestion

Frontend → `POST /upload` with multipart form data → API stores the uploaded CSV locally or in GCS depending on environment → API returns upload information/preview → user selects X/Y columns → frontend sends `POST /ingest` with `custom_data` → worker reads the CSV from local storage or GCS → worker writes datapoints to `stream:{dataset_id}` → frontend receives the data through the dataset WebSocket.

### AI Analysis

Frontend → `POST /analyze` → API pushes a job to `stream:analysis` → worker reads the analysis job → worker loads the requested dataset data from Redis, builds a prompt, and calls Gemini → worker saves the result to `analysis_results` in PostgreSQL → worker publishes the analysis result to `stream:analysis_result:{job_id}` → frontend connects to `WS /ws/analysis/{job_id}` and displays the result.

The backend pipeline has been tested end-to-end in the GCP environment:

**Frontend/API request → FastAPI → Redis Streams → Worker Pool → PostgreSQL/GCS/Gemini**

## 4. Repository Structure

```text
app_backend/
├── main.py                  # FastAPI app, REST routes, and WebSocket endpoints
├── core/
│   ├── jwt.py               # JWT encode/decode and password hashing
│   └── public_api.py        # yfinance / CoinGecko data fetchers
├── db/
│   ├── database.py          # PostgreSQL connection and dataset creation
│   └── schema.sql           # Database table definitions
├── redis/
│   └── redis_client.py      # Redis connection
├── workers/
│   └── worker.py            # Redis Streams consumer and Gemini analysis
├── models/
│   └── schemas.py           # Pydantic request/response models
└── api/
    └── routes/
        └── dataset.py       # Dataset-related routes

docker/
├── Dockerfile.api           # FastAPI container image
└── Dockerfile.worker        # Worker container image

Streamlytics/
├── src/
│   ├── pages/
│   ├── components/
│   ├── lib/
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── vite.config.js

requirements.txt             # Python dependencies
.env.sample                  # Environment variable template
```

The active frontend is the root `Streamlytics/` directory. Do not assume there is another active frontend copy under `frontend/`.

## 5. Local Development Commands

### Backend API

```bash
pip install -r requirements.txt

# Create .env from .env.sample and fill in local values
cp .env.sample .env

uvicorn app_backend.main:app --reload
```

### Worker

Run the worker in a separate terminal:

```bash
python -m app_backend.workers.worker
```

### Frontend

Run the frontend in a separate terminal:

```bash
cd Streamlytics
npm install
npm run dev
```

Local development can use PostgreSQL and Redis running locally or in Docker containers on a shared Docker network. Check `.env` and `.env.sample` for the current environment variable configuration.

Do not commit `.env` or other files containing secret values.

## 6. Cloud Deployment Architecture — Verified GCP Environment

| Concern          | Local development              | Production (GCP)                                                                                                 |
| ---------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| API hosting      | Uvicorn                        | Google Cloud Run service                                                                                         |
| Worker hosting   | Local Python process           | Google Cloud Run Worker Pool                                                                                     |
| Database         | Local/containerized PostgreSQL | Cloud SQL for PostgreSQL                                                                                         |
| Redis            | Local/containerized Redis      | Self-hosted Redis on a Compute Engine VM, accessed through its private VPC IP                                    |
| File storage     | Local disk                     | Google Cloud Storage                                                                                             |
| Container images | Local Docker images            | Artifact Registry                                                                                                |
| Secrets          | Local `.env`                   | Google Secret Manager                                                                                            |
| Networking       | Local Docker network           | VPC networking between Cloud Run and the private Redis VM; Cloud SQL connected through the Cloud SQL integration |

### Current GCP components

- **Cloud Run API:** `streamlytics-api`
- **Cloud Run Worker Pool:** `streamlytics-worker`
- **Cloud SQL:** PostgreSQL instance `streamlytics-pg`
- **Redis VM:** Compute Engine instance `streamlytics-redis`
- **Artifact Registry:** `streamlytics` repository
- **GCS bucket:** `streamlytics-demo-509115-uploads`
- **Secret Manager:** production application/database secrets

The API and worker use separate Docker images:

```text
docker/Dockerfile.api
docker/Dockerfile.worker
```

The worker is an infinite Redis Streams consumer and is deployed as a **Cloud Run Worker Pool**. Do not convert the worker into an HTTP service merely to make it deployable to Cloud Run.

### Explicitly not implemented

Do not assume or claim that the following are currently implemented:

- Kubernetes / GKE
- BigQuery
- Redis caching
- Multi-tenancy enforcement beyond the existing `org_id` scoping
- Load testing
- GitHub Actions or another CI/CD pipeline
- Redis Cluster
- Automated infrastructure provisioning

## 7. Important Environment Variables

Only variable names and their purposes should be documented here. Never include actual secret values.

| Variable                    | Used by     | Purpose                                                                                                                                                                    |
| --------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SECRET_KEY`                | API         | JWT/application secret. Local: `.env`; production: Secret Manager                                                                                                          |
| `GEMINI_API_KEY`            | Worker      | Gemini API authentication. Local: `.env`; production: Secret Manager                                                                                                       |
| `POSTGRES_DB`               | API, Worker | PostgreSQL database name                                                                                                                                                   |
| `POSTGRES_USER`             | API, Worker | PostgreSQL username                                                                                                                                                        |
| `POSTGRES_PASSWORD`         | API, Worker | PostgreSQL password. Local: `.env`; production: Secret Manager                                                                                                             |
| `POSTGRES_HOST`             | API, Worker | Local PostgreSQL host                                                                                                                                                      |
| `POSTGRES_PORT`             | API, Worker | PostgreSQL port                                                                                                                                                            |
| `CLOUD_SQL_CONNECTION_NAME` | API, Worker | Cloud SQL connection name used by the production Unix socket connection                                                                                                    |
| `REDIS_HOST`                | API, Worker | Redis hostname/IP. Local: Docker service or localhost; production: private IP of the Redis VM                                                                              |
| `REDIS_PORT`                | API, Worker | Redis port                                                                                                                                                                 |
| `FRONTEND_URL`              | API         | Frontend origin configuration. Currently defined by the application, but CORS still uses `allow_origins=["*"]`; this should be tightened after Firebase Hosting deployment |
| `BASE_STORAGE`              | API, Worker | Local upload directory                                                                                                                                                     |
| `GCS_BUCKET`                | API, Worker | When set, enables GCS-backed CSV storage in the cloud deployment                                                                                                           |
| `VITE_API_BASE_URL`         | Frontend    | Build-time base URL for the FastAPI API                                                                                                                                    |

Never place actual values for these variables in `CLAUDE.md`, `.env.sample`, commit messages, source comments, or other tracked files.

## 8. Development Conventions and Constraints

- The API and worker communicate **only through Redis Streams**. Do not introduce direct HTTP/RPC calls between them without an explicit architectural reason.
- Preserve the existing job-queue pattern:
  - `stream:jobs`
  - `stream:analysis`
  - `stream:{dataset_id}`
  - analysis result streams such as `stream:analysis_result:{job_id}`

- Preserve Redis consumer-group semantics using `XREADGROUP` and `XACK`. Do not silently replace the queue with Redis Pub/Sub or another mechanism.
- The worker is a long-running process and should remain compatible with the Cloud Run Worker Pool execution model.
- Local development behavior must continue to work when adding cloud-specific functionality.
- Use environment-variable-based configuration for local vs. cloud behavior rather than hardcoding deployment-specific values.
- Do not hardcode API URLs in frontend components. Use:

```javascript
import.meta.env.VITE_API_BASE_URL;
```

- Do not hardcode secrets, credentials, tokens, or API keys.
- Do not commit `.env` files containing actual secret values.
- When modifying cloud-specific behavior, preserve the local fallback path unless the task explicitly removes it.
- Before changing the architecture, inspect the current implementation rather than relying solely on this document.

## 9. Before Modifying the Architecture, Verify

Before making significant architectural changes, inspect the current repository and verify:

1. **Frontend location**
   The active frontend is `Streamlytics/`. Do not create or modify another frontend copy unless explicitly requested.

2. **Database connection**
   Read `app_backend/db/database.py` before changing database connectivity. The current production implementation uses `CLOUD_SQL_CONNECTION_NAME` and the Cloud SQL Unix socket path.

3. **Storage implementation**
   Read the current `/upload` implementation in `app_backend/main.py` and the CSV loading logic in `app_backend/workers/worker.py` before changing storage behavior. Local disk and GCS are both supported through environment-dependent paths.

4. **Docker configuration**
   The current Dockerfiles are:
   - `docker/Dockerfile.api`
   - `docker/Dockerfile.worker`

   Verify them before changing container build or deployment behavior.

5. **Worker execution model**
   The production worker runs as a Cloud Run Worker Pool, not a Cloud Run HTTP service. Do not add an HTTP server to the worker unless the deployment architecture is intentionally changed.

6. **CI/CD status**
   No GitHub Actions CI/CD pipeline is currently implemented. Do not claim automated builds or deployments unless a workflow file is actually present.

7. **Redis architecture**
   Redis is currently used for Streams-based job processing and live dataset data. Do not assume it is being used as a conventional cache.

8. **Cloud deployment status**
   The GCP backend has been manually deployed and verified. Do not assume Firebase Hosting, GitHub Actions, Kubernetes, or other future deployment components are already configured unless they are present in the repository or explicitly confirmed.

9. **Secrets**
   Never add secret values to this file or any tracked configuration file. Only document variable names and their purpose.

10. **Verify implementation before modifying it**
    If this document conflicts with the repository code, prefer the repository code and update `CLAUDE.md` to reflect the verified implementation.
