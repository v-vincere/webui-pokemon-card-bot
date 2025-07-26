# Project Plan: WebUI Pokemon Card Bot

This document outlines the plan for the WebUI Pokemon Card Bot project. It will be updated as the project progresses.

## 2025-07-25: Shrink Dashboard Summary Cards

- Updated `webui/frontend/js/dashboard.js` to change the Bootstrap grid classes for the summary stat cards, allowing more cards to fit in a row. Removed inline styles to centralize styling.
- Updated `webui/frontend/css/style.css` to reduce the padding and font sizes for the summary stat cards, making them smaller.

## 2025-07-25: Refactor My Collection Rarity Filters

- Updated `webui/frontend/js/my_collection.js` to simplify the rarity filter HTML generation, removing the counts and fixing invalid HTML in the `id` attributes. This makes the "My Collection" page filters visually consistent with the "Dashboard" page.

## 2025-07-25: Display rarity icons in table

## 2025-07-25: Fix Vertical Icon Stacking in Filters

- Wrapped rarity icon sets in a `<span>` with the class `rarity-icon-set` in both `dashboard.js` and `my_collection.js`.
- Added a CSS rule to `style.css` to apply `display: inline-flex` to the `rarity-icon-set` class, ensuring that icons for a single rarity are always displayed horizontally.

- Updated `webui/frontend/js/dashboard.js` to display rarity icons instead of text in the "All Cards" table.
- Updated `webui/frontend/js/dashboard.js` to display rarity icons in the chart legend.
- Added a custom legend to `webui/frontend/index.html` and styled it in `webui/frontend/css/style.css`.

## 2025-07-25: Replace rarity text with icons
- Updated `webui/frontend/css/my_collection.css` to apply consistent styling to the rarity filter.

- Updated `webui/frontend/js/dashboard.js` to replace rarity text with icons.
- Added versioning to CSS links in `index.html` and `my_collection.html` to prevent browser caching issues.
- Updated `webui/frontend/js/my_collection.js` to replace rarity text with icons.
- **2025-07-25: Docker Volume Mounts for Static Assets**
- **2025-07-25: Development Environment Fix**
- Modified `webui/docker-compose.yml` to mount the local `frontend` directory as a volume. This ensures that code changes are reflected immediately without needing to rebuild the Docker image, which was the root cause of the styling inconsistencies.
- When adding new static assets, ensure that they are mounted as volumes in the `docker-compose.yml` file for the `frontend` service.
- The `nginx.conf` file must also be updated to serve the new assets.
- The containers must be rebuilt after making these changes.
## 2025-07-25: Make the website responsive

The website is not responsive and does not display correctly on mobile devices. The following changes have been made to address this issue:

- Modified `webui/frontend/css/style.css` to make the filter and table components responsive.
- Adjusted the grid layout for the rarity filter at different screen sizes.
- Ensured the table content wraps properly.
- Removed duplicated CSS rules.
- Modified `webui/frontend/css/my_collection.css` to make the card grid responsive.
- Used a flexible grid layout that adapts to different screen sizes.
- Removed duplicated rarity filter styles.
- **2025-07-25: Second Fix for Rarity Filter (Failed)**
- Adjusted the `minmax` value in the grid template for the rarity filter to be smaller.
- Added styles to allow labels to wrap, preventing overflow on smaller screens. This resulted in poor visual wrapping.
- **2025-07-25: Third Fix for Rarity Filter**
- Replaced the `grid` layout with a `flexbox` layout for the rarity filter.
- This allows the filter options to wrap naturally without causing awkward text breaks.
- **2025-07-25: Regression Fix for My Collection Page**
- Adjusted the `grid-template-columns` for the card grid to ensure it displays three columns on mobile devices.
- **2025-07-25: Fix for Rarity by Account Table**
- Made the "Rarity by Account" table horizontally scrollable on mobile devices.
- Removed a faulty CSS rule that was overriding Bootstrap's responsive table styles.
- Added a new CSS rule to prevent table headers from wrapping.
- **2025-07-25: Font Size Adjustment**
- Reduced the font size in the main table to prevent text from wrapping on mobile devices.
- **2025-07-25: Rarity by Account Pagination**
- Added pagination to the "Rarity by Account" table.
- Updated the backend to support pagination for the `/api/rarity-by-account` endpoint.
- Updated the frontend to include pagination controls and handle the paginated data.
- Further reduced the font size of the "All Cards" table to prevent wrapping.
- **2025-07-25: JavaScript Bug Fix**
- Fixed a JavaScript error in `dashboard.js` that was causing a crash when rendering the pagination for the "All Cards" table.
- **2025-07-25: Reverted Pagination Logic**
- Reverted the pagination logic in `dashboard.js` to a working state to fix the crash.

## 2025-07-25: Add Rarity Distribution Table

- Updated `webui/frontend/index.html` to add a container for the rarity distribution table.
- Updated `webui/frontend/js/dashboard.js` to render a table with rarity counts and percentages.

## 2025-07-26: Add Password Protection

- **Goal**: Secure the website with a password prompt, allowing access only after successful authentication.

- **Implementation Details**:
    - Created a new `webui/frontend/password.html` page with a simple password form.
    - Added `webui/frontend/js/password.js` to handle form submission, limit login attempts to three, and store the attempt count in local storage.
    - Implemented a new `/api/login` endpoint in `webui/backend/app/main.py` to verify the password.
    - Upon successful login, the backend now sets a secure, HTTP-only cookie named `pokemon_card_session`.
    - Modified the `webui/Caddyfile` to act as a gatekeeper. It checks for the presence of the `pokemon_card_session` cookie.
    - The password is now configured via the `ACCESS_PASSWORD` environment variable in the `docker-compose.yml` file.

- **Troubleshooting & Resolution Log**:
    - **Initial Failure**: After implementation, the website became completely unresponsive, returning timeout errors.
    - **Attempt 1 (Incorrect Fix)**: Corrected the `Caddyfile` logic, simplifying the routing rules. This did not resolve the issue.
    - **Attempt 2 (Incorrect Fix)**: Added `pydantic` to `requirements.txt`, suspecting a missing dependency. This was incorrect as `fastapi` already manages this dependency and it did not resolve the issue.
    - **Attempt 3 (Incorrect Fix)**: Corrected the `X-Forwarded-Proto` header in `nginx.conf` to ensure the backend recognized the secure connection. This did not resolve the issue.
    - **Attempt 4 (Incorrect Fix)**: Added `--proxy-headers` to the `uvicorn` command in the `backend/Dockerfile`. This did not resolve the issue.
    - **Attempt 5 (Incorrect Fix)**: Discovered the `backend` service was not mounting the local source code in `docker-compose.yml`, meaning no code changes were being applied. Corrected the volume mount. This did not resolve the issue.
    - **Attempt 6 (Incorrect Fix)**: Discovered the absolute paths for the data volumes in `docker-compose.yml` were incorrect. Corrected the paths. This did not resolve the issue.
    - **Root Cause & Final Fix**: The Docker logs for the `caddy` container revealed the error: `module not registered: http.matchers.cookie`. The `caddy:2-alpine` image being used was a minimal build that lacked the required cookie-matching module. The issue was resolved by changing the image to the full-featured `caddy:2` in the `webui/docker-compose.yml` file. This allowed Caddy to start correctly, which in turn allowed the entire service stack to function.

## 2025-07-26: Fix Infinite Login Redirect

- **Problem**: The website was stuck in an infinite redirect loop on the password page, making it inaccessible.
- **Root Cause**: A race condition existed between the frontend and backend. The frontend JavaScript was redirecting the user to the main page *before* the browser had processed the `Set-Cookie` header from the backend's successful login response. This caused every subsequent request to be unauthenticated, triggering Caddy to redirect back to the password page.
- **Solution**:
    - Modified the `/api/login` endpoint in `webui/backend/app/main.py` to include a `redirect` URL in the JSON response.
    - Updated `webui/frontend/js/password.js` to read this `redirect` URL from the response and use it for the redirect. This ensures the redirect only happens after the response, including the cookie, has been processed by the browser.

## 2025-07-26: Website Outage Resolution

- **Problem**: The website was inaccessible, returning a timeout error.
- **Root Cause**: The Caddy service was failing to start due to a persistent error: `module not registered: http.matchers.cookie`. This error was misleading, as the issue was not a missing module but a syntax problem in the `Caddyfile` that Caddy's parser could not handle.
- **Troubleshooting & Resolution Log**:
    - **Attempt 1 (Incorrect Fix)**: Assumed a race condition between frontend redirect and backend cookie setting. Modified the application logic to have the backend drive the redirect. This did not resolve the timeout.
    - **Attempt 2 (Incorrect Fix)**: Suspected a stale Docker image. Forced a pull of the `caddy:2` image and recreated the containers. The error persisted.
    - **Attempt 3 (Incorrect Fix)**: Pinned the Caddy image to a specific version (`caddy:2.8.4`) to rule out tag ambiguity. The error persisted.
    - **Attempt 4 (Incorrect Fix)**: Attempted to build a custom Caddy image with the cookie module explicitly included. The build failed due to Go version incompatibilities.
    - **Attempt 5 (Incorrect Fix)**: Updated the custom build to use a newer Caddy version (`2.9.1`, then `2.10.0`) to resolve the Go version issue. The build continued to fail with module path errors.
    - **Attempt 6 (Incorrect Fix)**: Reverted to a standard Caddy image and tried various syntax adjustments in the `Caddyfile`, including quoting the cookie value and simplifying the matcher logic. The error persisted.
- **Final Fix**: The issue was resolved by removing the cookie-based authentication logic from the `Caddyfile` entirely. This allowed the Caddy service to start correctly, making the website accessible again. The password protection feature is temporarily disabled until a new implementation can be developed.

## 2025-07-26: Database and Password Fixes

- **Problem**: The dashboard was failing to load data, showing 500 errors. The root cause was a missing `identifications` table in the database. Additionally, the password protection feature was disabled.
- **Solution**:
    - Modified `webui/backend/app/main.py` to include a startup event that creates the `identifications` table if it does not exist. This resolves the database errors.
    - Rewrote the `webui/Caddyfile` to correctly re-implement the cookie-based password protection. The new configuration properly distinguishes between public and protected routes, redirecting unauthenticated users to the password page.

## 2025-07-26: Refactor Authentication to Backend Middleware

- **Problem**: The Caddy-based authentication was unreliable and caused the site to be inaccessible.
- **Solution**:
    - The `Caddyfile` was reverted to a simple reverse proxy configuration to ensure the site remains online.
    - Authentication logic was moved to a middleware in `webui/backend/app/main.py`. This middleware protects all API endpoints and returns a 401 Unauthorized error if the session cookie is not present.
    - The frontend JavaScript in `webui/frontend/js/dashboard.js` was updated to handle the 401 error by redirecting the user to the password page. This is a more robust and stable solution.

## Developer Notes

- **Docker Compose Command**: The command `docker-compose` is deprecated. Use `docker compose` (with a space) for all Docker Compose operations.

## 2025-07-26: Fix Database Errors on Dashboard

- **Problem**: The dashboard was failing to load, showing 500 Internal Server Errors for `/api/cards` and `/api/rarity-counts`. The backend logs revealed the error: `no such table: known_cards`.
- **Root Cause**: The backend service was unable to find the `pokemon_tcg_pocket_cards.csv` file. The volume mount in `webui/docker-compose.yml` pointed to an incorrect path (`/home/ubuntu/webui-pokemon-card-bot/data`), but the file was located in `/home/ubuntu/pokemon-card-bot/data`. This prevented the application from loading the necessary card data to populate the temporary `known_cards` table.
- **Solution**:
    - Corrected the volume mount path for the `backend` service in `webui/docker-compose.yml` to point to the correct data directory (`/home/ubuntu/pokemon-card-bot/data`). This allows the backend container to access the CSV file, resolving the database errors.

## 2025-07-26: Fix Broken Images on My Collection Page

- **Problem**: On the "My Collection" page, card images were not loading, and the card names were displayed as "undefined".
- **Root Cause**: There was a data mismatch between the frontend and the backend. The `/api/my-collection` endpoint in `webui/backend/app/main.py` returns card objects with the name in the `card_name` property. However, the frontend JavaScript in `webui/frontend/js/my_collection.js` was attempting to access it via `card.name`.
- **Solution**:
    - Modified `webui/frontend/js/my_collection.js` to use the correct property, `card.card_name`, when accessing the card's name. This resolves the "undefined" text and allows the image URLs to be correctly generated.

## 2025-07-26: Fix 404 Errors for Card Images

- **Problem**: After fixing the "undefined" card name issue, the card images were still not loading, resulting in 404 Not Found errors in the browser console.
- **Root Cause**: The volume mounts for the `card_images` and `icons` directories in `webui/docker-compose.yml` were pointing to an incorrect path (`/home/ubuntu/webui-pokemon-card-bot/data/...`). This was the same root cause as the earlier database issue.
- **Solution**:
    - Corrected the volume mount paths for the `frontend` service in `webui/docker-compose.yml` to point to the correct data directory (`/home/ubuntu/pokemon-card-bot/data/...`). This ensures the Nginx container has access to the image files and can serve them correctly.

## 2025-07-26: Fix Missing Icons

- **Problem**: After fixing the card image paths, the rarity icons were no longer loading.
- **Root Cause**: In the process of correcting the `card_images` volume mount, the path for the `icons` volume was also incorrectly changed to point to the external data directory. The icons are located within the project's local `data/icons` directory.
- **Solution**:
    - Reverted the `icons` volume mount path in `webui/docker-compose.yml` back to the correct location (`/home/ubuntu/webui-pokemon-card-bot/data/icons`). This restored access to the icon files for the frontend container.
## 2025-07-26: Add Expansion and Trainer Filters to My Collection

- **Goal**: Add two new filters to the "My Collection" page: one for card expansions and another for trainer cards.
- **Requirements**:
    - The expansion filter should be a set of toggles, with one for each unique expansion found in the `pokemon_tcg_pocket_cards.csv` file.
    - The trainer filter should be a single toggle.
    - Both filters should allow users to refine the displayed cards in their collection.

## 2025-07-26: Add Card Details Modal on Hover

- **Goal**: On the "Rarity by Account" table, show a modal with the specific cards when a user hovers over a cell with a card count.
- **Requirements**:
    - The modal should only appear on desktop browsers, not on mobile.
    - The columns in the "Rarity by Account" table should be in a specific, non-alphabetical order.
- **Implementation**:
    - **Backend**: Added a new endpoint `/api/cards-by-account-rarity` to `webui/backend/app/main.py` that returns the cards for a given account and rarity.
    - **Frontend (JavaScript)**:
        - In `webui/frontend/js/dashboard.js`, updated the `renderRarityByAccountTable` function to sort the columns according to the specified order.
        - Added event listeners (`mouseover`, `mouseout`, `mouseenter`, `mouseleave`) to the table body to manage showing and hiding the modal.
        - The modal's appearance is triggered on hover of table cells that have a card count greater than zero.
        - The feature is disabled for screen widths less than 992px.
        - When triggered, the frontend calls the new backend endpoint to fetch and display the relevant cards in the modal.
    - **Frontend (HTML)**: Added the HTML for the modal popup to `webui/frontend/index.html`.
    - **Frontend (CSS)**:
        - Created `webui/frontend/css/dashboard.css` to style the modal and add a hover effect to the table cells.
        - Linked the new stylesheet in `webui/frontend/index.html`.

## 2025-07-26: Add Sorting to Rarity by Account Table

- **Goal**: Add sorting functionality to all columns in the "Rarity by Account" table.
- **Requirements**:
    - All columns, including the rarity columns, should be sortable in both ascending and descending order.
    - The 'Crown' rarity should always be visible, even if there are no cards of that rarity.
- **Implementation**:
    - **Backend**: Updated the `/api/rarity-by-account` endpoint in `webui/backend/app/main.py` to accept `sort_by` and `sort_order` parameters. The endpoint now fetches all data, pivots it, ensures all rarity columns are present, sorts the data, and then paginates the results.
    - **Frontend (JavaScript)**:
        - In `webui/frontend/js/dashboard.js`, updated the `renderRarityByAccountTable` function to always render all rarity columns, including 'Crown'.
        - Added a new state variable, `raritySort`, to manage the sorting state of the table.
        - Added a click event listener to the table header to handle sorting.
        - Implemented `updateRaritySortUI` to visually indicate the current sort order.

## 2025-07-26: Fix Modal Positioning

- **Goal**: Prevent the card details modal from being cut off by the edge of the screen.
- **Implementation**:
    - Updated the `mouseover` event listener in `webui/frontend/js/dashboard.js` to dynamically calculate the modal's position.
    - The logic now checks if the modal would overflow the viewport horizontally or vertically and adjusts its position accordingly, ensuring it remains fully visible.

## 2025-07-26: Fix Modal Scrolling

- **Goal**: Allow the user to scroll within the card details modal without it disappearing.
- **Implementation**:
    - Modified the `mouseover` and `mouseout` event listeners for the modal and the table cells in `webui/frontend/js/dashboard.js`.
    - The modal will now remain open as long as the user's mouse is over either the table cell that triggered it or the modal itself. A short delay is used before hiding the modal to allow for seamless movement between the cell and the modal.

## 2025-07-26: Add Sorting to My Collection Page

- **Goal**: Add sorting functionality to the "My Collection" page to allow users to sort their cards.
- **Requirements**:
    - Add alphabetical sorting (A-Z and Z-A) for card names.
    - Add card count sorting (high to low) when grouping duplicates is enabled.
    - Add rarity sorting option.
    - Make sorting options independent so users can toggle any combination.
- **Implementation**:
    - **Backend**: Updated the `/api/my-collection` endpoint in `webui/backend/app/main.py` to accept multiple independent sorting parameters (`sort_name_asc`, `sort_name_desc`, `sort_rarity`, `sort_count`).
    - **Frontend (HTML)**: Replaced the dropdown select element with independent toggle switches for each sorting option in `webui/frontend/my_collection.html`.
    - **Frontend (JavaScript)**: 
        - In `webui/frontend/js/my_collection.js`, added event listeners for each sorting checkbox.
        - Implemented logic to enable/disable the count sorting option based on whether grouping duplicates is enabled.
        - Updated the API calls to include all selected sorting parameters.
        - The sorting options are now independent, allowing users to combine multiple sorting criteria.