# Project Plan: WebUI Pokemon Card Bot

This document is the central knowledge base for the WebUI Pokemon Card Bot project. It outlines the current architecture, key design decisions, and essential information for development.

## 1. Project Overview

A web application for tracking a Pokémon card collection. It features a dashboard with statistics, a searchable collection view, and password protection.

- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Backend**: Python with FastAPI
- **Proxy**: Caddy
- **Containerization**: Docker and Docker Compose

---

## 2. Architecture & Design Decisions

This section contains high-level architectural choices and the reasoning behind them.

### 2.1. Authentication
- **Current Implementation**: Authentication is handled by a **FastAPI middleware** in `webui/backend/app/main.py`.
- **History**: We initially used Caddy for cookie-based auth. This was **unreliable and abandoned** due to complexity and frequent site outages. The backend middleware approach is more robust and easier to debug.
- **Logic**: The middleware protects all `/api/` routes. If the `pokemon_card_session` cookie is missing, it returns a `401 Unauthorized` error. The frontend JavaScript then redirects the user to `password.html`.

### 2.2. Sorting Logic
- **Location**: Complex sorting logic is implemented on the **backend** in the `/api/my-collection` endpoint.
- **Precedence**: The sorting hierarchy is critical. The backend prioritizes sorting as follows: 1) By Count, 2) By Rarity (custom order), 3) By Name. The name sort is always applied as a secondary criterion.

### 2.3. Database
- The application uses a SQLite database (`pokemon_cards.db`).
- The necessary tables (`identifications`, etc.) are created automatically on application startup by a function in `webui/backend/app/main.py`.

---

## 3. Development Environment & Commands

### 3.1. Docker Compose
- **Command**: Use `docker compose` (with a space), not the legacy `docker-compose` (with a hyphen).
- **Live Reload**: The `docker-compose.yml` file uses volume mounts to enable live code reloading for both the frontend and backend services. This is essential for development.
- **Build & Run**: To build and run the services in detached mode, use:
  ```bash
  docker compose up --build -d
  ```
- **View Logs**: To view the logs for a specific service (e.g., the backend):
  ```bash
  docker compose logs -f backend
  ```

### 3.2. Critical Gotchas & Troubleshooting
This is the most important section. Read this before debugging.

- **`no such table` errors**: This is almost always a **Docker volume path error**. The backend container cannot find the source CSV file to populate the database. Double-check the volume paths in `webui/docker-compose.yml` and ensure they point to the correct location of the `data` directory on the host machine.
- **404 Errors for Images/Icons**: This is also a **Docker volume path error**. The Nginx/frontend container cannot find the image files. Verify the volume paths for `card-images` and `icons` in `webui/docker-compose.yml`.
- **Caddy Failures**: The `caddy:2-alpine` Docker image is minimal and **lacks the cookie module**. The project now uses the full `caddy:2` image to avoid this issue. If Caddy fails to start, check the `Caddyfile` for syntax errors *before* assuming it's a missing module.
- **Frontend Data Mismatches**: If the UI displays "undefined" or fails to load data correctly, check for mismatches between the JSON properties returned by the backend API and the properties being accessed by the frontend JavaScript (e.g., `card.card_name` vs. `card.name`).

---

## 4. Project Changelog (High-Level)

- **2025-07-26**:
    - Refactored authentication from Caddy to a more stable FastAPI backend middleware.
    - Implemented complex, multi-level sorting on the "My Collection" page with a clear precedence hierarchy.
    - Implemented hover-activated modals on the dashboard to show card details.
    - Fixed numerous bugs related to Docker volume paths, sorting logic, and UI layout.
- **2025-07-25**:
    - Added password protection.
    - Made the website responsive for mobile devices.
    - Replaced rarity text with icons across the application.