document.addEventListener('DOMContentLoaded', () => {
    const cardCollection = document.getElementById('card-collection');
    const loading = document.getElementById('loading');
    const searchBar = document.getElementById('search-bar');
    const groupDuplicatesCheckbox = document.getElementById('group-duplicates');
    const rarityFilter = document.getElementById('rarity-filter');
    const darkModeToggle = document.getElementById('darkModeToggle');

    let page = 1;
    const limit = 200;
    let isLoading = false;
    let hasMore = true;

    async function fetchCards(reset = false) {
        if (isLoading || (!hasMore && !reset)) return;
        isLoading = true;
        loading.style.display = 'block';

        if (reset) {
            page = 1;
            hasMore = true;
            cardCollection.innerHTML = '';
        }

        try {
            const group = groupDuplicatesCheckbox.checked;
            const query = searchBar.value;
            const selectedRarities = getSelectedRarities();
            const response = await fetch(`/api/my-collection?page=${page}&limit=${limit}&group=${group}&search=${query}&rarity=${selectedRarities.join(',')}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const cards = await response.json();

            if (cards.length < limit) {
                hasMore = false;
            }

            renderCards(cards);
            page++;
        } catch (error) {
            console.error('Failed to fetch cards:', error);
            // Optionally display an error message to the user
        } finally {
            isLoading = false;
            loading.style.display = 'none';
        }
    }

    function renderCards(cards) {
        cards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('card');
            
            const img = document.createElement('img');
            img.src = card.image_url || 'images/card_back.png'; // Fallback image
            img.alt = card.name;
            cardElement.appendChild(img);

            if (groupDuplicatesCheckbox.checked && card.count > 1) {
                const countElement = document.createElement('div');
                countElement.classList.add('card-count');
                countElement.textContent = `x${card.count}`;
                cardElement.appendChild(countElement);
            }
            
            cardCollection.appendChild(cardElement);
        });
    }

    function handleInfiniteScroll() {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500 && !isLoading) {
            fetchCards();
        }
    }

    // Event Listeners
    window.addEventListener('scroll', handleInfiniteScroll);
    groupDuplicatesCheckbox.addEventListener('change', () => fetchCards(true));
    searchBar.addEventListener('input', () => {
        // Debounce search input to avoid excessive API calls
        clearTimeout(searchBar.timer);
        searchBar.timer = setTimeout(() => {
            fetchCards(true);
        }, 500);
    });

    function getSelectedRarities() {
        return Array.from(rarityFilter.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    }

    function getRarityIcon(rarity) {
        const iconMappings = {
            'Crown': '<span class="rarity-icon-set"><img src="/icons/crown.png" class="rarity-icon"></span>',
            'Three Star': '<span class="rarity-icon-set"><img src="/icons/star.png" class="rarity-icon"><img src="/icons/star.png" class="rarity-icon"><img src="/icons/star.png" class="rarity-icon"></span>',
            'Two Star': '<span class="rarity-icon-set"><img src="/icons/star.png" class="rarity-icon"><img src="/icons/star.png" class="rarity-icon"></span>',
            'One Star': '<span class="rarity-icon-set"><img src="/icons/star.png" class="rarity-icon"></span>',
            'Two Shiny': '<span class="rarity-icon-set"><img src="/icons/two_shiny.png" class="rarity-icon"></span>',
            'One Shiny': '<span class="rarity-icon-set"><img src="/icons/one_shiny.png" class="rarity-icon"></span>',
            'Four Diamond': '<span class="rarity-icon-set"><img src="/icons/one_diamond.png" class="rarity-icon"><img src="/icons/one_diamond.png" class="rarity-icon"><img src="/icons/one_diamond.png" class="rarity-icon"><img src="/icons/one_diamond.png" class="rarity-icon"></span>',
            'Three Diamond': '<span class="rarity-icon-set"><img src="/icons/one_diamond.png" class="rarity-icon"><img src="/icons/one_diamond.png" class="rarity-icon"><img src="/icons/one_diamond.png" class="rarity-icon"></span>',
            'Two Diamond': '<span class="rarity-icon-set"><img src="/icons/one_diamond.png" class="rarity-icon"><img src="/icons/one_diamond.png" class="rarity-icon"></span>',
            'One Diamond': '<span class="rarity-icon-set"><img src="/icons/one_diamond.png" class="rarity-icon"></span>'
        };
        return iconMappings[rarity] || rarity;
    }

    async function populateRarityFilters() {
        try {
            const response = await fetch('/api/rarity-counts');
            const rarities = await response.json();

            const sortOrder = [
                'Crown', 'Three Star', 'Two Star', 'One Star',
                'Two Shiny', 'One Shiny',
                'Four Diamond', 'Three Diamond', 'Two Diamond', 'One Diamond'
            ];

            rarities.sort((a, b) => {
                const indexA = sortOrder.indexOf(a.rarity);
                const indexB = sortOrder.indexOf(b.rarity);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });

            rarityFilter.innerHTML = rarities.map(r => {
                const rarityClass = r.rarity.toLowerCase().replace(/\s+/g, '-');
                const rarityId = r.rarity.replace(/\s+/g, '');
                return `
                <div class="form-check form-switch rarity-toggle-${rarityClass}">
                    <input class="form-check-input" type="checkbox" id="rarity-${rarityId}" value="${r.rarity}">
                    <label class="form-check-label" for="rarity-${rarityId}">${getRarityIcon(r.rarity)}</label>
                </div>
            `}).join('');

            rarityFilter.addEventListener('change', () => fetchCards(true));
        } catch (error) {
            console.error('Failed to populate rarity filters:', error);
        }
    }
    
    function setupDarkMode() {
        darkModeToggle.addEventListener('change', () => {
            if (darkModeToggle.checked) {
                document.body.setAttribute('data-bs-theme', 'dark');
            } else {
                document.body.setAttribute('data-bs-theme', 'light');
            }
        });
    }

    // Initial load
    groupDuplicatesCheckbox.checked = true;
    setupDarkMode();
    populateRarityFilters();
    fetchCards();
});
    // --- Sidebar Toggle ---
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }