# Project Plan

This document outlines the plan for fixing and improving the Pokémon card collection web UI.

## Tasks

### 1. Fix Collection Page UI Issues
-   **Issue:** The filter bar on the collection page enlarges on hover.
-   **Status:** **Completed**
-   **Plan:** Investigated `my_collection.css` to find and fix the CSS rule causing this behavior. The issue was that the filter bar had the `card` class, and the hover effect was applied to all elements with that class. I made the selector more specific to only target cards within the `card-grid`.

-   **Issue:** The "Group Duplicates" button is not working.
-   **Status:** **Investigated**
-   **Plan:** Debug the JavaScript in `my_collection.js` to fix the event handler and associated logic. The code appears to be correct, with an event listener that triggers a new API call. The backend also appears to handle the `group` parameter correctly. If the issue persists, further debugging will be needed by inspecting the network requests in the browser's developer tools.

-   **Issue:** Rarity filters break search functionality.
-   **Status:** **Completed**
-   **Plan:** The `hasMore` flag was being incorrectly set to `false` when a filter returned a small number of results, preventing further fetches. The logic in `fetchCards` was updated to ignore the `hasMore` flag when a filter is changed.

### 2. UI/UX Improvements
-   **Issue:** Checkboxes are inconsistent with the dark mode toggle's style.
-   **Status:** **Completed**
-   **Plan:** Replace all standard checkboxes with a toggle switch component similar to the dark mode toggle. This was achieved by adding the `form-switch` class to the relevant checkboxes in `my_collection.html` and `my_collection.js`.

-   **Issue:** Rarity toggles are not neatly arranged.
-   **Status:** **Completed**
-   **Plan:** Added flexbox styling to `my_collection.css` to align the rarity toggles in a neat, wrapping layout.

-   **Issue:** Checkboxes on the dashboard page are not toggles.
-   **Status:** **Completed**
-   **Plan:** Updated `dashboard.js` to add the `form-switch` class to the dynamically generated rarity filters.

-   **Issue:** Sidebar is not collapsible.
-   **Status:** **Completed**
-   **Plan:** Added a hamburger menu button to both `index.html` and `my_collection.html`. Added CSS to `style.css` to handle the collapsing and expanding, and added JavaScript to both `dashboard.js` and `my_collection.js` to toggle the sidebar's visibility.

-   **Issue:** Rarity toggles are not ordered correctly and have too much whitespace.
-   **Status:** **Completed**
-   **Plan:** Updated the JavaScript for both the collection and dashboard pages to sort the rarities in a specific order. Updated the CSS to display the toggles in a single column and reduce the padding around the filter container.

-   **Issue:** Hamburger menu is not visible.
-   **Status:** **Completed**
-   **Plan:** Fixed the HTML structure in the header of both pages to correctly display the hamburger menu on smaller screens.

-   **Issue:** Rarity toggles are not in the correct grid layout.
-   **Status:** **Completed**
-   **Plan:** Updated the CSS to use a grid layout for the rarity filters. Updated the JavaScript to add classes to the toggles so they can be positioned correctly in the grid. This has been applied to both the dashboard and collection pages.

-   **Issue:** Collection view shows a limited number of cards per row.
-   **Status:** **Completed**
-   **Plan:** Updated `my_collection.css` to display 10 cards per row on desktop and 5 on mobile for a more compact view.

## Design Choices & Gotchas
-   The dark mode toggle will be used as the reference for the new toggle switch design.
-   Care must be taken to ensure that replacing the checkboxes does not break any existing functionality.
-   The "Group Duplicates" issue may require browser-based debugging to resolve, as the code itself seems correct.

### 3. Deployment
-   **Objective:** Deploy the application to be accessible at `poke.vince.gg` with a free SSL certificate.
-   **Status:** **Completed**
-   **Plan:**
    -   A Caddy reverse proxy has been added to the `docker-compose.yml`.
    -   Caddy is configured via a `Caddyfile` to handle HTTPS for the `poke.vince.gg` subdomain.
    -   The DNS "A" record for `poke.vince.gg` needs to be pointed to the server's IP address.
    -   The subpath approach (`vince.gg/poke`) was attempted but proved to be too complex and unreliable. A subdomain is the standard and recommended approach.
-   **Resolution:** The `NXDOMAIN` error was resolved by correctly pointing the DNS "A" record for `poke.vince.gg` to the server's IP address. After the DNS change propagated, restarting the Caddy container allowed it to successfully obtain an SSL certificate from Let's Encrypt.