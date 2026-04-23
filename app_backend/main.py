from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect
from fastapi import UploadFile, File
from dotenv import load_dotenv
import logging, os, uuid
import asyncio
import pandas as pd
from app_backend.models.schemas import EventSchema
from app_backend.redis.redis_client import redis_conn
from app_backend.core.jwt import get_current_user
from app_backend.db.database import create_dataset
from app_backend.api.routes.dataset import router as datalist_router

load_dotenv()

logger = logging.getLogger(__name__)
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app = FastAPI(title="Event Ingestion API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOB_STREAM = "stream:jobs"
BASE_STORAGE = os.getenv("BASE_STORAGE", "uploads")


@app.get("/")
def read_root():
    return {"status": "Ingestion API"}


@app.post("/upload")
async def upload(file: UploadFile = File(...), user=Depends(get_current_user)):
    try:
        file_id = str(uuid.uuid4())
        file_path = f"{BASE_STORAGE}/{file_id}.csv"
        os.makedirs(BASE_STORAGE, exist_ok=True)
        # save file
        with open(file_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)
        # preview
        df = pd.read_csv(file_path)

        preview = df.head(5).to_dict(orient="records")
        columns = list(df.columns)
        numeric_columns = df.select_dtypes(include="number").columns.tolist()

        return {
            "file_path": file_path,
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
