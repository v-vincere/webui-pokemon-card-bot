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

### Phase 12: Performance Optimization
*   [x] **Investigate Lagginess:** Diagnosed performance issues related to loading all card data at once.
*   [x] **Backend Pagination:**
    *   [x] Modified the `/api/cards` endpoint to accept `page` and `limit` parameters.
    *   [x] Updated the database query to use `LIMIT` and `OFFSET` for efficient data fetching.
    *   [x] Included pagination metadata (`total_records`, `current_page`, `total_pages`) in the API response.
*   [x] **Frontend Pagination:**
    *   [x] Added pagination controls to the `index.html` file.
    *   [x] Updated `dashboard.js` to handle the paginated API response.
    *   [x] Implemented a `renderPagination` function to dynamically create pagination buttons.
    *   [x] Added event listeners to the pagination controls to allow users to navigate between pages.

### Phase 13: UI and Bug Fixes
*   [x] **Fix Broken Images:** Corrected the volume mount in `docker-compose.yml` to ensure the frontend Nginx container has access to the centralized card images.
*   [x] **Improve Pagination UI:** Replaced the basic pagination with an advanced control that intelligently displays a limited number of page links for a cleaner user experience.
*   [x] **Fix Image Loading:** Resolved a persistent issue with broken images by adding a `.strip()` to the `card_name` lookup in `main.py` to handle hidden whitespace, and by making the Nginx configuration for the image directory more explicit.

### Phase 14: Startup Bug Fixes
*   [x] **Fix Nginx Crash:** Resolved a fatal error in the frontend container caused by a duplicate `location` block in the `nginx.conf` file.
*   [x] **Correct Docker Volumes:** Updated the `docker-compose.yml` file to use correct relative paths for the data and card image volumes, resolving data access issues.

### Phase 15: Image Loading Debugging
*   [x] **Investigate Broken Images:** Diagnosed an issue where card images were not loading in the web UI.
*   [x] **Fix Backend Data Handling:** Corrected the backend code in `main.py` to properly handle `sqlite3.Row` objects and ensure `image_url`s were being generated correctly.
*   [x] **Fix Nginx File Permissions:** Modified the `frontend/Dockerfile` to create the `/usr/share/nginx/html/card-images` directory and set the correct ownership for the `nginx` user, resolving potential file access issues.
*   [x] **Fix Image Loading (Final):**
    *   [x] **Isolate Nginx Issue:** Used a hardcoded image URL to confirm that the Nginx configuration was the root cause of the problem.
    *   [x] **Simplify Nginx Config:** Resolved the issue by simplifying the `/card-images/` location block in `nginx.conf`, removing the `try_files` directive and using a simple `alias` to ensure the files are served correctly.
### Phase 16: Advanced UI and Filtering
*   [x] **UI Restructuring:**
    *   [x] Moved the Rarity Distribution chart to the top row next to the summary statistics.
    *   [x] Resized the summary stat boxes to be smaller and more compact.
    *   [x] Adjusted the Rarity Distribution chart to be larger and more readable.
*   [x] **Table Enhancements:**
    *   [x] Removed the "Timestamp" column from the main card table.
    *   [x] Implemented column sorting (ascending/descending) for Card Name, Rarity, and Device Account.
*   [x] **Advanced Filtering:**
    *   [x] Added an "Advanced Filters" button that opens a modal.
    *   [x] Implemented filtering by Pokémon Type, Stage, and Artist.
    *   [x] Added "Reset" and "Apply" functionality to the filter modal.
*   [x] **Backend Updates:**
    *   [x] Created a new `/api/filter-options` endpoint to supply data for the filter modal.
    *   [x] Enhanced the `/api/cards` endpoint to handle complex sorting and filtering parameters.
### Phase 17: Bug Fixing and Final Polish
*   [x] **Bug Fix: Sorting Errors:**
    *   [x] Rewrote the frontend JavaScript logic to correctly manage sort state, fixing the "error loading data" message on the first click.
    *   [x] Added strict validation to the backend API to prevent 500 Internal Server Errors caused by invalid sort parameters.
*   [x] **Bug Fix: Rarity Filter:**
    *   [x] Added a null check in the frontend JavaScript to prevent the application from crashing when a card has a null rarity.
*   [x] **UI Enhancements:**
    *   [x] Converted the rarity filter from a dropdown to a series of checkboxes to allow for multi-selection.
    *   [x] Added a "Rows per page" selector to the table footer.
*   [x] **Code Cleanup:**
    *   [x] Removed all code related to the deprecated "Advanced Filter" modal.
### Phase 18: Critical Bug Fixes
*   [x] **Bug Fix: 500 Internal Server Error on Sort:**
    *   [x] Corrected the `sort_by` parameter validation in `main.py` to use the correct database column name (`device_account`).
    *   [x] Updated `dashboard.js` to send the correct `device_account` key when sorting.
*   [x] **Bug Fix: Frontend Crash on Null Rarity:**
    *   [x] Modified the `/api/rarity-counts` endpoint in `main.py` to filter out null rarity values before returning the response.
    *   [x] Added defensive checks in `dashboard.js` to prevent crashes if null data is ever received.
### Phase 18: Critical Bug Fixes
*   [x] **Bug Fix: 500 Internal Server Error on Sort:**
    *   [x] Corrected the `sort_by` parameter validation in `main.py` to use the correct database column name (`device_account`).
    *   [x] Updated `dashboard.js` to send the correct `device_account` key when sorting.
*   [x] **Bug Fix: Frontend Crash on Null Rarity:**
    *   [x] Modified the `/api/rarity-counts` endpoint in `main.py` to filter out null rarity values before returning the response.
    *   [x] Added defensive checks in `dashboard.js` to prevent crashes if null data is ever received.
### Phase 19: Final Bug Fixes &amp; Polishing
*   [x] **Diagnosed Critical Sorting Bug:** Identified a persistent bug causing a 500 Internal Server Error and a frontend data loading error when sorting columns. The root causes were twofold:
    1.  The `data-sort` attribute in `index.html` for the "Device Account" column was using `deviceAccount` (camelCase) instead of `device_account` (snake_case), which did not match the database schema.
    2.  The backend API was not validating this incorrect column name, leading to a fatal SQL error.
*   [x] **Fixed Backend Sorting Logic:**
    *   Corrected the `allowed_sort_columns` list in `main.py` to use the proper `device_account` column name.
    *   Enhanced backend validation to reject any invalid sort parameters immediately, preventing future SQL errors.
*   [x] **Fixed Frontend Sorting Logic:**
    *   Corrected the `data-sort` attribute in `index.html` to `device_account`.
    *   Rewrote the JavaScript sorting event handler in `dashboard.js` to be more robust and correctly manage the sort state, preventing the initial "error loading data" message.
*   [x] **Fixed Null Rarity Crash:**
    *   Identified a frontend crash caused by `null` values in the `rarity` column from the database.
    *   Updated the `/api/rarity-counts` endpoint in `main.py` to filter out any `null` rarities before sending the data to the frontend.
    *   Added defensive null checks to the `populateRarityFilter` and `renderSummaryStats` functions in `dashboard.js` to prevent any future crashes from unexpected null data.