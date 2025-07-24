import sqlite3
import os

# Get DB URL from environment variable, fallback to local path for non-Docker execution
DATABASE_URL = os.getenv("DATABASE_URL", os.path.join(os.path.dirname(__file__), "../../../data/pokemon_cards.db"))

def get_db_connection():
    conn = sqlite3.connect(DATABASE_URL, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()