from fastapi import FastAPI, Depends, Query, HTTPException, Request, Response
from app.dependencies import get_db_connection
import sqlite3
import pandas as pd
import os
from pydantic import BaseModel

app = FastAPI()

@app.on_event("startup")
def startup_event():
    """
    On startup, connect to the database and create the 'identifications' table
    if it doesn't already exist.
    """
    db_path = os.getenv("DATABASE_URL", os.path.join(os.path.dirname(__file__), "../../../data/pokemon_cards.db"))
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS identifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_name TEXT NOT NULL,
            rarity TEXT NOT NULL,
            deviceAccount TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

# --- Password Protection ---
ACCESS_PASSWORD = os.getenv("ACCESS_PASSWORD", "password123")
SESSION_COOKIE_NAME = "pokemon_card_session"

class LoginRequest(BaseModel):
    password: str

@app.post("/api/login")
async def login(request: LoginRequest, response: Response):
    if request.password == ACCESS_PASSWORD:
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value="authenticated",
            httponly=True,
            samesite="strict",
            secure=True, # Set to True if using HTTPS
        )
        return {"message": "Login successful", "redirect": "/"}
    else:
        raise HTTPException(status_code=401, detail="Invalid password")

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """
    This middleware protects all API routes except for the login page.
    It checks for a valid session cookie and returns a 401 response
    if the cookie is not present.
    """
    public_paths = ["/api/login", "/docs", "/openapi.json", "/password.html", "/js/password.js", "/css/style.css"]
    
    if request.url.path in public_paths or not request.url.path.startswith("/api"):
        return await call_next(request)

    if SESSION_COOKIE_NAME not in request.cookies:
        return Response("Unauthorized", status_code=401)

    return await call_next(request)

# --- Card Data Loading ---
CARD_DATA_PATH = os.getenv("CARD_DATA_PATH", '/app/data/pokemon_tcg_pocket_cards.csv')
try:
    card_info_df = pd.read_csv(CARD_DATA_PATH)
    card_info_df['card_name_lower'] = card_info_df['card_name'].str.strip().str.lower().replace('_', '-')
    card_info_df['rarity_lower'] = card_info_df['rarity'].str.strip().str.lower()
    card_info_df['image_filename'] = card_info_df['image_filename'].str.strip()
    # Create a composite key (card_name, rarity) for the lookup
    card_info_df['category_lower'] = card_info_df['category'].str.strip().str.lower()
    # Handle duplicates: some cards have the same name and rarity
    card_info_df.drop_duplicates(subset=['card_name_lower', 'rarity_lower'], keep='first', inplace=True)
    card_info_lookup = card_info_df.set_index(['card_name_lower', 'rarity_lower'])[['image_filename', 'set_name', 'category_lower']].to_dict('index')
except FileNotFoundError:
    print(f"Warning: Card data file not found at {CARD_DATA_PATH}. Image URLs will not be available.")
    card_info_lookup = {}

def setup_known_cards_temp_table(conn: sqlite3.Connection):
    """
    Creates and populates a temporary table with known card name/rarity pairs.
    This is used to efficiently filter queries to only include cards with images.
    """
    if not card_info_lookup:
        return

    cursor = conn.cursor()
    cursor.execute("CREATE TEMP TABLE IF NOT EXISTS known_cards (name TEXT, rarity TEXT, set_name TEXT, category TEXT, PRIMARY KEY (name, rarity))")
    
    cursor.execute("SELECT COUNT(1) FROM known_cards")
    if cursor.fetchone()[0] == 0:
        known_cards_data = [
            (name, rarity, data['set_name'], data['category_lower'])
            for (name, rarity), data in card_info_lookup.items()
        ]
        cursor.executemany("INSERT INTO known_cards (name, rarity, set_name, category) VALUES (?, ?, ?, ?)", known_cards_data)
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
            card_info = card_info_lookup.get((normalized_card_name, normalized_rarity))
            if card_info:
                card_dict['image_url'] = f'/card-images/{card_info["image_filename"]}' if card_info["image_filename"] else None
            else:
                card_dict['image_url'] = None
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
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("deviceAccount"),
    sort_order: str = Query("asc")
):
    setup_known_cards_temp_table(conn)
    """
    Provides a paginated, pivoted table of rarity counts per device account.
    """
    cursor = conn.cursor()

    # Get all rarity counts for all accounts
    query = """
        SELECT
            COALESCE(i.deviceAccount, 'N/A') as deviceAccount,
            i.rarity,
            COUNT(*) as count
        FROM
            identifications i
        JOIN known_cards k ON REPLACE(LOWER(TRIM(i.card_name)), '_', '-') = k.name AND LOWER(TRIM(i.rarity)) = k.rarity
        WHERE
            i.rarity IS NOT NULL
        GROUP BY
            i.deviceAccount, i.rarity
    """
    try:
        df = pd.read_sql_query(query, conn)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {e}")

    # Pivot the table
    pivot_df = df.pivot(index='deviceAccount', columns='rarity', values='count').fillna(0).astype(int)

    # Ensure all rarities are present as columns
    all_rarities = ['Crown', 'Three Star', 'Two Star', 'One Star', 'Two Shiny', 'One Shiny', 'Four Diamond', 'Three Diamond', 'Two Diamond', 'One Diamond']
    for rarity_col in all_rarities:
        if rarity_col not in pivot_df.columns:
            pivot_df[rarity_col] = 0
    
    # Sort the data
    if sort_by in pivot_df.columns:
        pivot_df.sort_values(by=sort_by, ascending=(sort_order == 'asc'), inplace=True)
    else: # Default to sorting by account name
        pivot_df.sort_index(ascending=(sort_order == 'asc'), inplace=True)

    # Paginate the results
    total_accounts = len(pivot_df)
    offset = (page - 1) * limit
    paginated_df = pivot_df.iloc[offset:offset + limit]

    # Convert to the desired JSON format
    result = paginated_df.to_dict(orient='index')
    
    return {
        "total_records": total_accounts,
        "page": page,
        "limit": limit,
        "total_pages": (total_accounts + limit - 1) // limit,
        "data": result
    }
@app.get("/api/cards-by-account-rarity")
def get_cards_by_account_rarity(
    account: str,
    rarity: str,
    conn: sqlite3.Connection = Depends(get_db_connection)
):
    """
    Fetches all cards for a specific account and rarity.
    """
    setup_known_cards_temp_table(conn)
    cursor = conn.cursor()

    query = """
        SELECT i.card_name, i.rarity
        FROM identifications i
        JOIN known_cards k ON REPLACE(LOWER(TRIM(i.card_name)), '_', '-') = k.name AND LOWER(TRIM(i.rarity)) = k.rarity
        WHERE i.deviceAccount = ? AND i.rarity = ?
        ORDER BY i.card_name
    """
    
    try:
        cursor.execute(query, (account, rarity))
        cards_data = cursor.fetchall()
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    cards_list = []
    for card in cards_data:
        card_dict = dict(card)
        card_name = card_dict.get('card_name')
        card_rarity = card_dict.get('rarity')
        
        if card_name and card_rarity:
            normalized_card_name = card_name.strip().lower().replace('_', '-')
            normalized_rarity = card_rarity.strip().lower()
            card_info = card_info_lookup.get((normalized_card_name, normalized_rarity))
            if card_info:
                card_dict['image_url'] = f'/card-images/{card_info["image_filename"]}' if card_info["image_filename"] else None
            else:
                card_dict['image_url'] = None
        else:
            card_dict['image_url'] = None
            
        cards_list.append(card_dict)

    return cards_list

@app.get("/api/expansions")
def get_expansions():
    """
    Returns a list of unique expansion set names.
    """
    if 'set_name' in card_info_df.columns:
        expansions = card_info_df['set_name'].unique().tolist()
        filtered_expansions = [exp for exp in expansions if exp != 'Promos-A']
        return sorted(filtered_expansions)
    return []


@app.get("/api/my-collection")
def get_my_collection(
    conn: sqlite3.Connection = Depends(get_db_connection),
    page: int = Query(1, ge=1),
    limit: int = Query(200, ge=1, le=1000),
    group: bool = Query(False),
    q: str = Query(None, alias="search"),
    rarity: str = Query(None),
    expansion: str = Query(None),
    trainer: bool = Query(False),
    sort_name_asc: bool = Query(False),
    sort_name_desc: bool = Query(False),
    sort_rarity: bool = Query(False),
    sort_count: bool = Query(False)
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
    
    if expansion:
        expansion_list = [e.strip() for e in expansion.split(',') if e.strip()]
        if expansion_list:
            placeholders = ','.join('?' for _ in expansion_list)
            conditions.append(f"k.set_name IN ({placeholders})")
            params.extend(expansion_list)

    if trainer:
        conditions.append("k.category = 'trainer'")

    where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""

    # Build order clause based on multiple sorting options
    order_parts = []
    
    # Add name ascending sort
    if sort_name_asc:
        order_parts.append("i.card_name ASC")
    
    # Add name descending sort
    if sort_name_desc:
        order_parts.append("i.card_name DESC")
        
    # Add rarity sort with custom order
    if sort_rarity:
        # Define the custom rarity order
        rarity_order = [
            'Crown', 'Three Star', 'Two Star', 'One Star',
            'Two Shiny', 'One Shiny',
            'Four Diamond', 'Three Diamond', 'Two Diamond', 'One Diamond'
        ]
        # Create a CASE statement for custom ordering
        case_parts = []
        for i, rarity in enumerate(rarity_order):
            case_parts.append(f"WHEN i.rarity = '{rarity}' THEN {i}")
        case_statement = "CASE " + " ".join(case_parts) + " END"
        order_parts.append(case_statement)
        
    # Add count sort (only when grouping)
    if sort_count and group:
        order_parts.append("count DESC")
    
    # Default sorting if no options selected
    if not order_parts:
        if group:
            order_parts.append("i.card_name ASC, i.rarity")
        else:
            order_parts.append("i.timestamp DESC")
    
    order_clause = "ORDER BY " + ", ".join(order_parts)

    if group:
        select_clause = "SELECT i.card_name, i.rarity, COUNT(*) as count"
        group_clause = "GROUP BY i.card_name, i.rarity"
        query = f"{select_clause} {base_query} {where_clause} {group_clause} {order_clause} LIMIT ? OFFSET ?"
    else:
        select_clause = "SELECT i.card_name, i.rarity"
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
            card_info = card_info_lookup.get((normalized_card_name, normalized_rarity))
            if card_info:
                card_dict['image_url'] = f'/card-images/{card_info["image_filename"]}' if card_info["image_filename"] else None
            else:
                card_dict['image_url'] = None
        else:
            card_dict['image_url'] = None
            
        cards_list.append(card_dict)

    return cards_list