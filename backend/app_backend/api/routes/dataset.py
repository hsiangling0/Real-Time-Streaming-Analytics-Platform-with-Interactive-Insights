from fastapi import APIRouter, Depends
from app_backend.core.jwt import get_current_user
from app_backend.db.database import get_conn

router = APIRouter()


@router.get("/datalist")
def get_datasets(user=Depends(get_current_user)):
    org_id = user["org_id"]

    conn = get_conn()
    cur = conn.cursor()

    # include tenant data
    cur.execute(
        """
        SELECT id, name, type, source, org_id, created_at
        FROM datasets
        WHERE org_id = %s
        ORDER BY created_at DESC;
        """, (org_id, ))

    rows = cur.fetchall()

    cur.close()
    conn.close()

    return [{
        "id": r[0],
        "name": r[1],
        "type": r[2],
        "source": r[3],
        "org_id": r[4],
        "created_at": r[5].isoformat(),
    } for r in rows]
