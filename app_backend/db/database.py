import psycopg2
import os


def get_conn():
    return psycopg2.connect(
        dbname=os.getenv("POSTGRES_DB", "streaming_db"),
        user=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASSWORD", "postgres"),
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=os.getenv("POSTGRES_PORT", "5432"),
    )


def create_dataset(org_id, name, data_type, source=None):
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO datasets (org_id, name, type, source)
        VALUES (%s, %s, %s, %s)
        RETURNING id;
        """,
        (org_id, name, data_type, source),
    )

    dataset_id = cur.fetchone()[0]

    conn.commit()
    cur.close()
    conn.close()

    return dataset_id
