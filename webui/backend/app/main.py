from fastapi import FastAPI, Depends, Query
from app.dependencies import get_db_connection
import sqlite3
import pandas as pd
import os

app = FastAPI()

# --- Card Data Loading ---
CARD_DATA_PATH = os.getenv("CARD_DATA_PATH", '/app/data/pokemon_tcg_pocket_cards.csv')
try:
    card_info_df = pd.read_csv(CARD_DATA_PATH)
    # Create a lookup dictionary from card_name to image_filename
    card_image_lookup = pd.Series(card_info_df.image_filename.values, index=card_info_df.card_name).to_dict()
except FileNotFoundError:
    print(f"Warning: Card data file not found at {CARD_DATA_PATH}. Image URLs will not be available.")
    card_image_lookup = {}

@app.get("/api/cards")
def get_all_cards(
    conn: sqlite3.Connection = Depends(get_db_connection),
    search: str = Query(None),
    rarity: str = Query(None)
):
    base_query = "SELECT * FROM identifications"
    conditions = []
    params = []

    if search:
        conditions.append("card_name LIKE ?")
        params.append(f"%{search}%")
    
    if rarity:
        conditions.append("rarity = ?")
        params.append(rarity)

    if conditions:
        base_query += " WHERE " + " AND ".join(conditions)

    cursor = conn.cursor()
    cursor.execute(base_query, tuple(params))
    cards_data = cursor.fetchall()
    cards_list = []
    for card in cards_data:
        card_dict = dict(card)
        card_name = card_dict.get('card_name')
        image_filename = card_image_lookup.get(card_name)
        
        if image_filename:
            card_dict['image_url'] = f'/card-images/{image_filename}'
        else:
            card_dict['image_url'] = None
        cards_list.append(card_dict)

    return cards_list

@app.get("/api/rarity-counts")
def get_rarity_counts(conn: sqlite3.Connection = Depends(get_db_connection)):
    cursor = conn.cursor()
    cursor.execute("SELECT rarity, COUNT(*) as count FROM identifications GROUP BY rarity")
    rarity_counts = cursor.fetchall()
    return [dict(row) for row in rarity_counts]