from jose import jwt
import os

SECRET = os.getenv("SECRET_KEY", "")

token = jwt.encode({"org_id": "test_org"}, SECRET, algorithm="HS256")
print(token)
