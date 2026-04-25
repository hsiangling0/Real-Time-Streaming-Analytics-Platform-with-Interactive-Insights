import redis
import os

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", 6379)

redis_conn = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    decode_responses=True  #return string
)
