from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect
from fastapi import UploadFile, File
from dotenv import load_dotenv
import logging, os, uuid, io
import asyncio
import pandas as pd
import json
from app_backend.db.database import get_conn
from app_backend.core.jwt import hash_password, verify_password, create_access_token
from app_backend.models.schemas import EventSchema, AnalyzeRequest, RegisterRequest, LoginRequest
from app_backend.redis.redis_client import redis_conn
from app_backend.core.jwt import get_current_user
from app_backend.db.database import create_dataset
from app_backend.api.routes.dataset import router as datalist_router
from google.cloud import storage
from app_backend.redis.redis_client import redis_conn

load_dotenv()

logger = logging.getLogger(__name__)
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app = FastAPI(title="Event Ingestion API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOB_STREAM = "stream:jobs"
# BASE_STORAGE = os.getenv("BASE_STORAGE", "uploads")


@app.get("/test-redis")
def test_redis():
    redis_conn.set("test", "hello")
    return {"value": redis_conn.get("test")}


@app.get("/")
def read_root():
    return {"status": "Ingestion API"}


@app.post("/register")
def register(req: RegisterRequest):
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE account=%s", (req.account, ))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Account already exists")
        hashed = hash_password(req.password)

        cur.execute(
            """
        INSERT INTO users (account, password_hash, org_id)
        VALUES (%s, %s, %s)
        RETURNING id
        """,
            (req.account, hashed, req.org_id),
        )

        user_id = cur.fetchone()[0]
        conn.commit()

        cur.close()
        conn.close()

        token = create_access_token({"user_id": user_id, "org_id": req.org_id})

        return {"access_token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/login")
def login(req: LoginRequest):
    try:
        conn = get_conn()
        cur = conn.cursor()

        cur.execute("SELECT id, password_hash, org_id FROM users WHERE account=%s", (req.account, ))
        user = cur.fetchone()

        cur.close()
        conn.close()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_id, password_hash, org_id = user

        if not verify_password(req.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = create_access_token({"user_id": user_id, "org_id": org_id})

        return {"access_token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/upload")
async def upload(file: UploadFile = File(...), user=Depends(get_current_user)):
    try:
        file_id = str(uuid.uuid4())
        bucket_name = os.getenv("GCS_BUCKET")

        if not bucket_name:
            raise Exception("GCS_BUCKET not set")

        client = storage.Client()
        bucket = client.bucket(bucket_name)

        blob_path = f"uploads/{file_id}.csv"
        blob = bucket.blob(blob_path)

        content = await file.read()

        blob.upload_from_string(content, content_type="text/csv")

        df = pd.read_csv(io.BytesIO(content))

        preview = df.head(5).to_dict(orient="records")
        columns = list(df.columns)
        numeric_columns = df.select_dtypes(include="number").columns.tolist()

        return {
            "file_path": blob_path,  # store GCS path instead
            "columns": columns,
            "numeric_columns": numeric_columns,
            "preview": preview
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingest")
async def ingest(event: EventSchema, user=Depends(get_current_user)):
    try:
        org_id = user["org_id"]
        payload = {"type": event.event_type, "org_id": org_id, **event.data.model_dump()}

        dataset_name = payload.get("symbol") if event.event_type == "market_data" else payload.get(
            "nickname").split('/')[-1]

        dataset_source = payload.get("source") if event.event_type == "market_data" else "upload"
        dataset_id = create_dataset(payload["org_id"], dataset_name, event.event_type,
                                    dataset_source)
        payload["dataset_id"] = dataset_id
        message_id = redis_conn.xadd(JOB_STREAM, payload)

        logger.info(f"Job created: type={payload['type']},dataset={dataset_id}, id={message_id}")

        return {
            "status": "queued",
            "job_id": message_id,
            "dataset_id": dataset_id,
            "type": payload["type"]
        }

    except Exception as e:
        logger.error(f"Ingestion error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/analyze")
async def analyze(request: AnalyzeRequest, user=Depends(get_current_user)):
    try:
        job_id = str(uuid.uuid4())
        payload = {
            "type": "analysis",
            "job_id": job_id,
            "dataset_ids": json.dumps(request.dataset_ids),
            "question": request.question,
            "org_id": user["org_id"]
        }
        print(job_id)
        redis_conn.xadd("stream:analysis", payload)
        return {"status": "queued", "job_id": job_id}
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# /datalist
app.include_router(datalist_router)


@app.websocket("/ws/{dataset_id}")
async def websocket_endpoint(websocket: WebSocket, dataset_id: int):
    await websocket.accept()
    print(f"[WS CONNECT] {dataset_id}")

    last_id = "0-0"
    try:
        while True:
            response = await asyncio.to_thread(redis_conn.xread, {f"stream:{dataset_id}": last_id},
                                               10, 5000)

            if not response:
                continue

            for _, messages in response:
                for message_id, data in messages:
                    last_id = message_id
                    print("[SEND]", data)

                    await websocket.send_json({
                        "x": data.get("x"),
                        "y": data.get("y"),
                    })

    except WebSocketDisconnect:
        print(f"[WS DISCONNECT] {dataset_id}")


@app.websocket("/ws/analysis/{job_id}")
async def analysis_ws(websocket: WebSocket, job_id: str):
    await websocket.accept()

    last_id = "0-0"
    try:
        while True:
            response = await asyncio.to_thread(redis_conn.xread,
                                               {f"stream:analysis_result:{job_id}": last_id}, 10,
                                               5000)

            if not response:
                continue

            for _, messages in response:
                for message_id, data in messages:
                    last_id = message_id

                    await websocket.send_json({"result": data.get("result")})
    except WebSocketDisconnect:
        print(f"[WS DISCONNECT] {job_id}")
