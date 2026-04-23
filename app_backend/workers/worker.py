import time
import socket
import pandas as pd
from app_backend.redis.redis_client import redis_conn
from app_backend.core.public_api import fetch_crypto_series, fetch_stock

JOB_STREAM = "stream:jobs"

GROUP_NAME = "worker_group"
CONSUMER_NAME = f"worker-{socket.gethostname()}"


def init_consumer_group():
    try:
        redis_conn.xgroup_create(name=JOB_STREAM, groupname=GROUP_NAME, id="0", mkstream=True)
        print(f"[INIT] Created group for {JOB_STREAM}")
    except Exception as e:
        if "BUSYGROUP" not in str(e):
            print(f"[ERROR] Group creation failed: {e}")


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
    # Example:
    # - update global metrics
    # - cache latest price
    # - push to dashboard

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
    # Example:
    # - update tenant-specific metrics
    # - write to BigQuery / DB
    # - enforce org isolation


def process_event(message_id, data):
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


def run_worker():
    print(f"[START] Worker running...")
    init_consumer_group()

    while True:
        try:
            response = redis_conn.xreadgroup(
                groupname=GROUP_NAME,
                consumername=CONSUMER_NAME,
                streams={JOB_STREAM: ">"},
                count=10,
                block=5000  # 5 sec
            )
            if not response:
                continue

            for _, messages in response:
                for message_id, data in messages:
                    process_event(message_id, data)

        except Exception as e:
            print(f"[FATAL] Worker loop error: {e}")
            time.sleep(2)


if __name__ == "__main__":
    run_worker()
