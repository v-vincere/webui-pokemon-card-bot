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