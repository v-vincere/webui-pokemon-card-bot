from fastapi import FastAPI, Depends, Query, HTTPException
from app.dependencies import get_db_connection
import sqlite3
import pandas as pd
import os

app = FastAPI()

# --- Card Data Loading ---
CARD_DATA_PATH = os.getenv("CARD_DATA_PATH", '/app/data/pokemon_tcg_pocket_cards.csv')
try:
    card_info_df = pd.read_csv(CARD_DATA_PATH)
    card_info_df['card_name_lower'] = card_info_df['card_name'].str.strip().str.lower().str.replace('_', '-')
    card_info_df['image_filename'] = card_info_df['image_filename'].str.strip()
    card_image_lookup = pd.Series(card_info_df.image_filename.values, index=card_info_df.card_name_lower).to_dict()
except FileNotFoundError:
    print(f"Warning: Card data file not found at {CARD_DATA_PATH}. Image URLs will not be available.")
    card_image_lookup = {}

@app.get("/api/cards")
def get_all_cards(
    conn: sqlite3.Connection = Depends(get_db_connection),
    search: str = Query(None),
    rarity: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=1000),
    sort_by: str = Query("timestamp"),
    sort_order: str = Query("desc")
):
    # --- Parameter Validation ---
    # Corrected column name to match database schema
    allowed_sort_columns = ["card_name", "rarity", "device_account", "timestamp"]
    if sort_by not in allowed_sort_columns:
        raise HTTPException(status_code=400, detail=f"Invalid sort column. Allowed values are: {', '.join(allowed_sort_columns)}")
    
    if sort_order.lower() not in ["asc", "desc"]:
        raise HTTPException(status_code=400, detail="Invalid sort order. Allowed values are: asc, desc")

    # --- Query Building ---
    base_query = "FROM identifications"
    conditions = []
    params = []

    if search:
        conditions.append("card_name LIKE ?")
        params.append(f"%{search}%")
    
    if rarity:
        rarity_list = [r.strip() for r in rarity.split(',') if r.strip()]
        if rarity_list:
            placeholders = ','.join('?' for _ in rarity_list)
            conditions.append(f"rarity IN ({placeholders})")
            params.extend(rarity_list)

    where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""

    # --- Database Execution ---
    cursor = conn.cursor()
    
    count_query = "SELECT COUNT(*) " + base_query + where_clause
    try:
        cursor.execute(count_query, tuple(params))
        total_records = cursor.fetchone()[0]
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error during count: {e}")

    offset = (page - 1) * limit
    order_clause = f"ORDER BY {sort_by} {sort_order.upper()}"
    data_query = f"SELECT * {base_query} {where_clause} {order_clause} LIMIT ? OFFSET ?"
    
    query_params = list(params)
    query_params.extend([limit, offset])
    
    try:
        cursor.execute(data_query, tuple(query_params))
        cards_data = cursor.fetchall()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error during data fetch: {e}")
    
    # --- Data Processing ---
    cards_list = []
    for card in cards_data:
        card_dict = {key: card[key] for key in card.keys()}
        card_name = card_dict.get('card_name')
        if card_name:
            normalized_card_name = card_name.strip().lower().replace('_', '-')
            image_filename = card_image_lookup.get(normalized_card_name)
            card_dict['image_url'] = f'/card-images/{image_filename}' if image_filename else None
        else:
            card_dict['image_url'] = None
        cards_list.append(card_dict)

    return {
        "total_records": total_records,
        "page": page,
        "limit": limit,
        "total_pages": (total_records + limit - 1) // limit,
        "cards": cards_list
    }

@app.get("/api/rarity-counts")
def get_rarity_counts(conn: sqlite3.Connection = Depends(get_db_connection)):
    cursor = conn.cursor()
    cursor.execute("SELECT rarity, COUNT(*) as count FROM identifications GROUP BY rarity ORDER BY count DESC")
    rarity_counts = cursor.fetchall()
    # Filter out null rarities before returning
    return [dict(row) for row in rarity_counts if row['rarity'] is not None]