# Project Plan: Pokémon Card Web UI & Analytics Dashboard

## Project Goal
Create a modern, responsive web user interface with a dashboard and analytics to view and analyze the contents of the SQLite database.

## Technology Stack
*   **Backend:** FastAPI
*   **Frontend:** Bootstrap, Chart.js
*   **Database:** SQLite
*   **Deployment:** Docker

## Project Restructuring: Separation of Bot and Web UI

The project has been split into two separate components to improve modularity and simplify deployment:

1.  **Discord Bot:** `/home/ubuntu/pokemon-card-bot`
2.  **Web UI:** `/home/ubuntu/webui-pokemon-card-bot`

This separation allows for independent development, deployment, and maintenance of each component.

## Directory Structure

### Discord Bot (`/home/ubuntu/pokemon-card-bot`)
```
pokemon-card-bot/
├── discord_bot.py
├── Dockerfile
├── requirements.txt
├── deploy.sh
├── run.sh
└── ... (other bot-related files)
```

### Web UI (`/home/ubuntu/webui-pokemon-card-bot`)
```
webui-pokemon-card-bot/
├── webui/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── main.py
│   │   │   └── dependencies.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── frontend/
│       ├── css/
│       │   └── style.css
│       ├── js/
│       │   └── dashboard.js
│       ├── index.html
│       └── Dockerfile
├── docker-compose.yml
├── deploy.sh
└── run.sh
```

## Project Phases

### Phase 1: Project Scaffolding (Completed)
*   [x] Create the `webui`, `webui/backend`, and `webui/frontend` directories.
*   [x] Create placeholder files for the backend and frontend.

### Phase 2: Backend Development (FastAPI) (Completed)
*   [x] Set up the FastAPI application.
*   [x] Create API endpoints to retrieve card data (e.g., all cards, cards by account, rarity counts).
*   [x] Implement database connection and query logic.

### Phase 3: Frontend Development (HTML/Bootstrap/Chart.js) (Completed)
*   [x] Create the main `index.html` file with Bootstrap for layout.
*   [x] Develop the dashboard UI, including tables and chart placeholders.
*   [x] Write JavaScript to fetch data from the backend API.
*   [x] Use Chart.js to create interactive charts for analytics.

### Phase 4: Dockerization (Completed)
*   [x] Create a `Dockerfile` for the backend FastAPI application.
*   [x] Create a `Dockerfile` for the frontend static files.
*   [x] Create a `docker-compose.yml` to manage both services.

### Phase 5: Deployment Scripting (Completed)
*   [x] Created `deploy.sh` and `run.sh` scripts for both the bot and webui projects.

This plan will be updated as we complete each step.

### Phase 6: Cloud Deployment and Exposure (Completed)
*   [x] Updated the `run.sh` script to use the modern `docker compose` command.
*   [x] Configured the Oracle Cloud Infrastructure (OCI) Security List to allow ingress traffic on port 8080.
*   [x] Configured the VM's `iptables` firewall to allow traffic on port 8080.
*   [x] The application is now accessible at `http://&lt;your_vm_public_ip&gt;:8080`.

### Phase 7: Web UI Debugging and Fixing
*   [x] Investigated why the web UI was blank.
*   [x] Corrected the Nginx `proxy_pass` port to allow the frontend to communicate with the backend.

### Deployment Notes
*   The `deploy.sh` script is intended for remote deployment from a local machine.
*   When running directly on the host VM, use the `run.sh` script to start the services.
*   [x] Corrected the `CMD` instruction in the backend Dockerfile to use the correct module path (`app.main:app`).
*   [x] Corrected the relative import in `main.py` to an absolute import to resolve the `ImportError`.
*   [x] Added `ENV PYTHONPATH=/app` to the backend Dockerfile to resolve the `ModuleNotFoundError`.
*   [x] Restructured the backend Dockerfile to use a `/code` working directory and a clean `PYTHONPATH` to resolve the module import error permanently.

### Phase 8: UI/UX and Feature Enhancement (Completed)
*   [x] **UI Overhaul:**
    *   [x] Implement a modern dashboard layout with a sidebar for navigation.
    *   [x] Add a dark mode feature with a toggle switch.
    *   [x] Ensure the design is responsive for both desktop and mobile browsers.
*   [x] **Enhanced Functionality:**
    *   [x] Implement a dynamic search bar that filters cards as the user types.
    *   [x] Add filtering options for rarity and device account.
    *   [x] Change the rarity distribution chart from a pie chart to a bar chart.
    *   [x] Make the rarity chart interactive, allowing users to click on a rarity to filter the card list.
    *   [x] Implement a feature to display card images on hover.
    *   [x] Create a summary section to display aggregated stats (total cards, rarity counts).
*   [x] **Backend Updates:**
    *   [x] Create a new API endpoint to handle search and filter queries.
    *   [x] Add card image URLs to API responses by merging with external data.

### Phase 9: Web UI Debugging and Fixing (Part 2)
*   [x] Investigated the 502 Bad Gateway errors.
*   [x] Corrected the hardcoded CSV file path in `main.py` to use the correct in-container path.
*   [x] Added `check_same_thread=False` to the SQLite connection in `dependencies.py` to prevent threading errors.
*   [x] Added error handling in `main.py` to allow the application to start even if the card data CSV is missing.

### Phase 10: Project Separation
*   [x] Separated the Web UI and Discord Bot into two distinct projects.
*   [x] Moved all Web UI related files to `/home/ubuntu/webui-pokemon-card-bot`.
*   [x] Updated `run.sh` and `deploy.sh` scripts for both projects to work independently.

### Phase 11: Fixing 500 Internal Server Errors
*   [x] **Investigate Errors:** Diagnosed 500 Internal Server Errors originating from the backend.
*   [x] **Correct Data Path:** Updated `docker-compose.yml` to mount the central data directory (`/home/ubuntu/pokemon-card-bot/data`) to ensure the web UI has access to the correct database and CSV files.
*   [x] **Improve DB Connection:** Refactored the `get_db_connection` function in `dependencies.py` to use a generator, ensuring proper resource management and preventing connection leaks.
*   [x] **Refactor Backend Logic:**
    *   Removed manual `conn.close()` calls in `main.py` now that the dependency handles it.
    *   Made the card data CSV path configurable via an environment variable (`CARD_DATA_PATH`).
    *   Simplified data handling by removing redundant `dict()` conversions.