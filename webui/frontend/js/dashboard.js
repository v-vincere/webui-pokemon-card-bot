document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const searchInput = document.getElementById('search-input');
    const rarityFilter = document.getElementById('rarity-filter');
    const tableBody = document.getElementById('cards-table-body');
    const rarityChartCtx = document.getElementById('rarity-chart').getContext('2d');
    const imageTooltip = document.getElementById('image-tooltip');
    const summaryStatsContainer = document.getElementById('summary-stats');

    let rarityChart;
    let allCards = [];

    // --- Dark Mode ---
    darkModeToggle.addEventListener('change', () => {
        document.body.setAttribute('data-bs-theme', darkModeToggle.checked ? 'dark' : 'light');
    });

    // --- Data Fetching ---
    async function fetchCards(search = '', rarity = '') {
        let url = `/api/cards?`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (rarity) url += `rarity=${encodeURIComponent(rarity)}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            allCards = await response.json();
            renderTable(allCards);
        } catch (error) {
            console.error("Failed to fetch cards:", error);
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Error loading data.</td></tr>`;
        }
    }

    async function fetchRarityCounts() {
        try {
            const response = await fetch('/api/rarity-counts');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const rarityData = await response.json();
            populateRarityFilter(rarityData);
            renderRarityChart(rarityData);
            renderSummaryStats(rarityData);
        } catch (error) {
            console.error("Failed to fetch rarity counts:", error);
        }
    }

    // --- Rendering ---
    function renderTable(cards) {
        tableBody.innerHTML = '';
        if (cards.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No cards found.</td></tr>`;
            return;
        }
        cards.forEach(card => {
            let row = tableBody.insertRow();
            const imageCell = row.insertCell(0);
            if (card.image_url) {
                const img = document.createElement('img');
                img.src = card.image_url;
                img.alt = card.card_name;
                img.classList.add('card-img-top');
                img.style.width = '50px';
                imageCell.appendChild(img);
            } else {
                imageCell.textContent = 'N/A';
            }
            
            row.insertCell(1).textContent = card.card_name;
            row.insertCell(2).textContent = card.rarity;
            row.insertCell(3).textContent = card.deviceAccount;
            row.insertCell(4).textContent = card.timestamp;
        });
    }

    function renderRarityChart(data) {
        const labels = data.map(item => item.rarity);
        const counts = data.map(item => item.count);

        if (rarityChart) {
            rarityChart.destroy();
        }

        rarityChart = new Chart(rarityChartCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Card Count',
                    data: counts,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const chartElement = elements[0];
                        const rarity = labels[chartElement.index];
                        rarityFilter.value = rarity;
                        fetchCards(searchInput.value, rarity);
                    }
                }
            }
        });
    }

    function renderSummaryStats(rarityData) {
        summaryStatsContainer.innerHTML = '';
        const totalCards = rarityData.reduce((sum, item) => sum + item.count, 0);

        // Total Cards Stat
        let totalStat = document.createElement('div');
        totalStat.className = 'col-md-3';
        totalStat.innerHTML = `
            <div class="card text-center">
                <div class="card-body">
                    <h5 class="card-title">Total Cards</h5>
                    <p class="card-text fs-4">${totalCards}</p>
                </div>
            </div>`;
        summaryStatsContainer.appendChild(totalStat);

        // Rarity Stats
        rarityData.forEach(item => {
            let rarityStat = document.createElement('div');
            rarityStat.className = 'col-md-3';
            rarityStat.innerHTML = `
                <div class="card text-center">
                    <div class="card-body">
                        <h5 class="card-title">${item.rarity}</h5>
                        <p class="card-text fs-4">${item.count}</p>
                    </div>
                </div>`;
            summaryStatsContainer.appendChild(rarityStat);
        });
    }

    function populateRarityFilter(data) {
        rarityFilter.innerHTML = '<option value="">All Rarities</option>';
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.rarity;
            option.textContent = item.rarity;
            rarityFilter.appendChild(option);
        });
    }

    // --- Event Listeners ---
    searchInput.addEventListener('input', () => {
        fetchCards(searchInput.value, rarityFilter.value);
    });

    rarityFilter.addEventListener('change', () => {
        fetchCards(searchInput.value, rarityFilter.value);
    });

    tableBody.addEventListener('mouseover', e => {
        if (e.target.tagName === 'IMG') {
            const tooltipImg = imageTooltip.querySelector('img');
            tooltipImg.src = e.target.src;
            imageTooltip.style.display = 'block';
            imageTooltip.style.left = `${e.pageX + 15}px`;
            imageTooltip.style.top = `${e.pageY + 15}px`;
        }
    });

    tableBody.addEventListener('mouseout', e => {
        if (e.target.tagName === 'IMG') {
            imageTooltip.style.display = 'none';
        }
    });
    
    tableBody.addEventListener('mousemove', e => {
        if (imageTooltip.style.display === 'block') {
            imageTooltip.style.left = `${e.pageX + 15}px`;
            imageTooltip.style.top = `${e.pageY + 15}px`;
        }
    });

    // --- Initial Load ---
    function initializeDashboard() {
        fetchCards();
        fetchRarityCounts();
    }

    initializeDashboard();
});