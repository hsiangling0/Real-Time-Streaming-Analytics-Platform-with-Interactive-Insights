import time, os
import socket
import json
import pandas as pd
from dotenv import load_dotenv
from app_backend.redis.redis_client import redis_conn
from app_backend.core.public_api import fetch_crypto_series, fetch_stock
from app_backend.db.database import get_conn
import google.generativeai as genai

load_dotenv()
JOB_STREAM = "stream:jobs"
ANALYSIS_STREAM = "stream:analysis"
GROUP_NAME = "worker_group"
CONSUMER_NAME = f"worker-{socket.gethostname()}"
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))


def init_consumer_group():
    for stream in ["stream:jobs", "stream:analysis"]:
        try:
            redis_conn.xgroup_create(name=stream, groupname=GROUP_NAME, id="0", mkstream=True)
            print(f"[INIT] Created group for {stream}")
        except Exception as e:
            if "BUSYGROUP" not in str(e):
                print(f"[ERROR] {stream}: {e}")


def process_public_event(data, org_id, dataset_id):
    print(f"[PUBLIC] {data}")
    symbol = data.get("symbol")
    source = data.get("source")
    if source == "yfinance":
        price_series = fetch_stock(symbol)
    else:
        price_series = fetch_crypto_series(symbol)
    stream_key = f"stream:{dataset_id}"
    print(dataset_id)
    for point in price_series:
        redis_conn.xadd(
            stream_key, {
                "org_id": org_id,
                "event_type": "market_data",
                "symbol": symbol,
                "x": point["time"],
                "y": point["price"],
                "timestamp": time.time(),
                "source": source
            })
    time.sleep(0.05)


def process_private_event(data, org_id, dataset_id):
    print(f"[PRIVATE] {data}")
    file_path = data.get("file_path")
    if not file_path:
        raise ValueError("file_path missing")
    x_label = data.get("x_label")
    y_label = data.get("y_label")
    df = pd.read_csv(file_path)
    stream_key = f"stream:{dataset_id}"
    for _, row in df.iterrows():
        redis_conn.xadd(
            stream_key, {
                "org_id": org_id,
                "event_type": "custom_data",
                "x": row[x_label],
                "y": row[y_label],
                "timestamp": time.time(),
            })
        time.sleep(0.01)


def process_ingest(message_id, data):
    try:
        job_type = data.get("type")
        org_id = data.get("org_id")
        dataset_id = data.get("dataset_id")
        if job_type == "market_data":
            process_public_event(data, org_id, dataset_id)
        elif job_type == "custom_data":
            process_private_event(data, org_id, dataset_id)
        redis_conn.xack(JOB_STREAM, GROUP_NAME, message_id)

    except Exception as e:
        print(f"[ERROR] Failed processing {message_id}: {e}")


def get_dataset_name(dataset_id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT name FROM datasets WHERE id = %s", (dataset_id, ))
    result = cur.fetchone()
    cur.close()
    conn.close()

    return result[0] if result else f"Dataset {dataset_id}"


def load_data(dataset_ids):
    datasets = {}

    for dataset_id in dataset_ids:
        stream_key = f"stream:{dataset_id}"

        messages = redis_conn.xrevrange(stream_key, count=100)
        points = []
        for _, data in messages:
            points.append({"x": data.get("x"), "y": float(data.get("y"))})
        datasets[dataset_id] = {"name": get_dataset_name(dataset_id), "points": points}

    return datasets


def build_prompt(dataset_data, question):
    context = ""

    for _, dataset in dataset_data.items():
        name = dataset["name"]
        points = dataset["points"]
        if not points:
            continue

        values = [p["y"] for p in points]

        # basic stats
        min_v = min(values)
        max_v = max(values)
        avg_v = sum(values) / len(values)
        latest = values[-1]

        # trend (simple slope)
        trend = "increasing" if values[-1] > values[0] else "decreasing"

        # volatility (simple)
        volatility = max_v - min_v

        # sample last 10 points
        sample = "\n".join([f"{p['x']} → {p['y']}" for p in points[-10:]])

        context += f"""
Dataset {name}:
- Min: {min_v}
- Max: {max_v}
- Avg: {avg_v:.2f}
- Latest: {latest}
- Trend: {trend}
- Volatility: {volatility}

Recent data points:
{sample}
"""

    prompt = f"""
You are a professional data analyst.

Here is dataset information:
{context}

User question:
{question}

Instructions:
- Identify trends and patterns
- Highlight anomalies if any
- Give clear, concise insights (non-technical if possible)
"""

    return prompt


def call_gemini(prompt):
    try:
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        print("[GEMINI ERROR]", e)
        return "Failed to generate analysis."


def save_analysis_result(dataset_ids, question, result):
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO analysis_results (dataset_ids, question, result)
        VALUES (%s, %s, %s)
    """, (json.dumps(dataset_ids), question, result))

    conn.commit()
    cur.close()
    conn.close()


def process_analysis_event(message_id, data):
    job_id = data.get("job_id")
    dataset_ids = data.get("dataset_ids")
    if isinstance(dataset_ids, str):
        dataset_ids = json.loads(dataset_ids)
    question = data.get("question")
    dataset_data = load_data(dataset_ids)
    prompt = build_prompt(dataset_data, question)
    result = call_gemini(prompt)
    save_analysis_result(dataset_ids, question, result)
    redis_conn.xadd(f"stream:analysis_result:{job_id}", {"result": result})
    redis_conn.xack(JOB_STREAM, GROUP_NAME, message_id)


def run_worker():
    print(f"[START] Worker running...")
    init_consumer_group()

    while True:
        try:
            response = redis_conn.xreadgroup(
                groupname=GROUP_NAME,
                consumername=CONSUMER_NAME,
                streams={
                    JOB_STREAM: ">",
                    ANALYSIS_STREAM: ">"
                },
                count=10,
                block=5000  # 5 sec
            )
            if not response:
                continue

            for stream_name, messages in response:
                for message_id, data in messages:
                    if stream_name == JOB_STREAM:
                        process_ingest(message_id, data)
                    elif stream_name == ANALYSIS_STREAM:
                        process_analysis_event(message_id, data)

        except Exception as e:
            print(f"[FATAL] Worker loop error: {e}")
            time.sleep(2)


if __name__ == "__main__":
    run_worker()
