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
    card_info_df['card_name_lower'] = card_info_df['card_name'].str.strip().str.lower().replace('_', '-')
    card_info_df['rarity_lower'] = card_info_df['rarity'].str.strip().str.lower()
    card_info_df['image_filename'] = card_info_df['image_filename'].str.strip()
    # Create a composite key (card_name, rarity) for the lookup
    card_image_lookup = pd.Series(
        card_info_df.image_filename.values,
        index=[card_info_df.card_name_lower, card_info_df.rarity_lower]
    ).to_dict()
except FileNotFoundError:
    print(f"Warning: Card data file not found at {CARD_DATA_PATH}. Image URLs will not be available.")
    card_image_lookup = {}

def setup_known_cards_temp_table(conn: sqlite3.Connection):
    """
    Creates and populates a temporary table with known card name/rarity pairs.
    This is used to efficiently filter queries to only include cards with images.
    """
    if not card_image_lookup:
        return

    cursor = conn.cursor()
    cursor.execute("CREATE TEMP TABLE IF NOT EXISTS known_cards (name TEXT, rarity TEXT, PRIMARY KEY (name, rarity))")
    
    cursor.execute("SELECT COUNT(1) FROM known_cards")
    if cursor.fetchone()[0] == 0:
        known_pairs = list(card_image_lookup.keys())
        cursor.executemany("INSERT INTO known_cards (name, rarity) VALUES (?, ?)", known_pairs)
        conn.commit()

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
    # Create a temporary table of known cards to filter against
    setup_known_cards_temp_table(conn)

    # --- Parameter Validation ---
    allowed_sort_columns = ["card_name", "rarity", "deviceAccount", "timestamp"]
    if sort_by not in allowed_sort_columns:
        raise HTTPException(status_code=400, detail=f"Invalid sort column. Allowed values are: {', '.join(allowed_sort_columns)}")
    
    if sort_order.lower() not in ["asc", "desc"]:
        raise HTTPException(status_code=400, detail="Invalid sort order. Allowed values are: asc, desc")

    # --- Query Building ---
    base_query = "FROM identifications i JOIN known_cards k ON REPLACE(LOWER(TRIM(i.card_name)), '_', '-') = k.name AND LOWER(TRIM(i.rarity)) = k.rarity"
    conditions = []
    params = []

    if search:
        conditions.append("i.card_name LIKE ?")
        params.append(f"%{search}%")
    
    if rarity:
        rarity_list = [r.strip() for r in rarity.split(',') if r.strip()]
        if rarity_list:
            placeholders = ','.join('?' for _ in rarity_list)
            conditions.append(f"i.rarity IN ({placeholders})")
            params.extend(rarity_list)

    where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""

    # --- Database Execution ---
    cursor = conn.cursor()
    
    count_query = "SELECT COUNT(i.rowid) " + base_query + where_clause
    try:
        cursor.execute(count_query, tuple(params))
        total_records = cursor.fetchone()[0]
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error during count: {e}")

    offset = (page - 1) * limit
    order_clause = f"ORDER BY i.{sort_by} {sort_order.upper()}"
    data_query = f"SELECT i.* {base_query} {where_clause} {order_clause} LIMIT ? OFFSET ?"
    
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
        if not card_dict.get('deviceAccount'):
            card_dict['deviceAccount'] = 'N/A'
        card_name = card_dict.get('card_name')
        rarity = card_dict.get('rarity')
        if card_name and rarity:
            normalized_card_name = card_name.strip().lower().replace('_', '-')
            normalized_rarity = rarity.strip().lower()
            # Look up image with (name, rarity) composite key
            image_filename = card_image_lookup.get((normalized_card_name, normalized_rarity))
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
    setup_known_cards_temp_table(conn)
    cursor = conn.cursor()
    query = """
        SELECT i.rarity, COUNT(*) as count
        FROM identifications i
        JOIN known_cards k ON REPLACE(LOWER(TRIM(i.card_name)), '_', '-') = k.name AND LOWER(TRIM(i.rarity)) = k.rarity
        WHERE i.rarity IS NOT NULL
        GROUP BY i.rarity
        ORDER BY count DESC
    """
    cursor.execute(query)
    rarity_counts = cursor.fetchall()
    return [dict(row) for row in rarity_counts]

@app.get("/api/rarity-by-account")
def get_rarity_by_account(
    conn: sqlite3.Connection = Depends(get_db_connection),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    setup_known_cards_temp_table(conn)
    """
    Provides a paginated, pivoted table of rarity counts per device account.
    """
    # Step 1: Get a paginated list of unique device accounts
    cursor = conn.cursor()
    
    count_query = "SELECT COUNT(DISTINCT deviceAccount) FROM identifications"
    cursor.execute(count_query)
    total_accounts = cursor.fetchone()[0]
    
    offset = (page - 1) * limit
    accounts_query = "SELECT DISTINCT deviceAccount FROM identifications ORDER BY deviceAccount LIMIT ? OFFSET ?"
    cursor.execute(accounts_query, (limit, offset))
    paginated_accounts = [row[0] for row in cursor.fetchall()]

    if not paginated_accounts:
        return {"total_records": 0, "page": page, "limit": limit, "total_pages": 0, "data": {}}

    # Step 2: Fetch rarity counts for only the paginated accounts
    placeholders = ','.join('?' for _ in paginated_accounts)
    query = f"""
        SELECT
            COALESCE(i.deviceAccount, 'N/A') as deviceAccount,
            i.rarity,
            COUNT(*) as count
        FROM
            identifications i
        JOIN known_cards k ON REPLACE(LOWER(TRIM(i.card_name)), '_', '-') = k.name AND LOWER(TRIM(i.rarity)) = k.rarity
        WHERE
            i.rarity IS NOT NULL AND i.deviceAccount IN ({placeholders})
        GROUP BY
            i.deviceAccount, i.rarity
    """
    try:
        df = pd.read_sql_query(query, conn, params=paginated_accounts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {e}")

    if df.empty:
        # This can happen if accounts have no cards with known rarities
        empty_data = {acc: {} for acc in paginated_accounts}
        return {
            "total_records": total_accounts,
            "page": page,
            "limit": limit,
            "total_pages": (total_accounts + limit - 1) // limit,
            "data": empty_data
        }

    # Pivot the table
    pivot_df = df.pivot(index='deviceAccount', columns='rarity', values='count').fillna(0).astype(int)
    
    # Ensure all paginated accounts are in the result, even if they had no cards
    for acc in paginated_accounts:
        if acc not in pivot_df.index:
            pivot_df.loc[acc] = 0
            
    # Convert to the desired JSON format
    result = pivot_df.to_dict(orient='index')
    
    return {
        "total_records": total_accounts,
        "page": page,
        "limit": limit,
        "total_pages": (total_accounts + limit - 1) // limit,
        "data": result
    }

@app.get("/api/my-collection")
def get_my_collection(
    conn: sqlite3.Connection = Depends(get_db_connection),
    page: int = Query(1, ge=1),
    limit: int = Query(200, ge=1, le=1000),
    group: bool = Query(False),
    q: str = Query(None, alias="search"),
    rarity: str = Query(None)
):
    setup_known_cards_temp_table(conn)
    cursor = conn.cursor()

    base_query = "FROM identifications i JOIN known_cards k ON REPLACE(LOWER(TRIM(i.card_name)), '_', '-') = k.name AND LOWER(TRIM(i.rarity)) = k.rarity"
    conditions = []
    params = []

    if q:
        conditions.append("i.card_name LIKE ?")
        params.append(f"%{q}%")

    if rarity:
        rarity_list = [r.strip() for r in rarity.split(',') if r.strip()]
        if rarity_list:
            placeholders = ','.join('?' for _ in rarity_list)
            conditions.append(f"i.rarity IN ({placeholders})")
            params.extend(rarity_list)

    where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""

    if group:
        select_clause = "SELECT i.card_name, i.rarity, COUNT(*) as count"
        order_clause = "ORDER BY i.card_name, i.rarity"
        group_clause = "GROUP BY i.card_name, i.rarity"
        query = f"{select_clause} {base_query} {where_clause} {group_clause} {order_clause} LIMIT ? OFFSET ?"
    else:
        select_clause = "SELECT i.card_name, i.rarity"
        order_clause = "ORDER BY i.timestamp DESC"
        query = f"{select_clause} {base_query} {where_clause} {order_clause} LIMIT ? OFFSET ?"

    offset = (page - 1) * limit
    query_params = params + [limit, offset]
    
    try:
        cursor.execute(query, tuple(query_params))
        cards_data = cursor.fetchall()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    cards_list = []
    for card in cards_data:
        card_dict = dict(card)
        card_name = card_dict.get('card_name')
        rarity = card_dict.get('rarity')
        
        if card_name and rarity:
            normalized_card_name = card_name.strip().lower().replace('_', '-')
            normalized_rarity = rarity.strip().lower()
            image_filename = card_image_lookup.get((normalized_card_name, normalized_rarity))
            card_dict['image_url'] = f'/card-images/{image_filename}' if image_filename else None
        else:
            card_dict['image_url'] = None
            
        cards_list.append(card_dict)

    return cards_list