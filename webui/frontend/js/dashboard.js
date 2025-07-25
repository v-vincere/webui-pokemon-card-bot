document.addEventListener('DOMContentLoaded', function() {
    // --- Element Caching ---
    const darkModeToggle = document.getElementById('darkModeToggle');
    const searchInput = document.getElementById('search-input');
    const rarityFilterContainer = document.getElementById('rarity-filter');
    const tableBody = document.getElementById('cards-table-body');
    const rarityPieChartCtx = document.getElementById('rarity-pie-chart').getContext('2d');
    const imageTooltip = document.getElementById('image-tooltip');
    const rarityPieChartLegend = document.getElementById('rarity-pie-chart-legend');
    const summaryStatsContainer = document.getElementById('summary-stats');
    const rarityByAccountTableHead = document.getElementById('rarity-by-account-table-head');
    const rarityByAccountTableBody = document.getElementById('rarity-by-account-table-body');
    const paginationControls = document.getElementById('pagination-controls');
    const rowsPerPageSelect = document.getElementById('rows-per-page');
    const rarityRowsPerPageSelect = document.getElementById('rarity-rows-per-page');
    const rarityPaginationControls = document.getElementById('rarity-pagination-controls');
    const tableHeader = document.querySelector('thead');

    // --- State Management ---
    let rarityPieChart;
    let currentPage = 1;
    let limit = 100;
    let rarityCurrentPage = 1;
    let rarityLimit = 20;
    let currentSort = {
        by: 'timestamp',
        order: 'desc'
    };

    // --- Dark Mode ---
    darkModeToggle.addEventListener('change', () => {
        document.body.setAttribute('data-bs-theme', darkModeToggle.checked ? 'dark' : 'light');
    });

    // --- Data Fetching ---
    async function fetchCards() {
        const search = searchInput.value;
        const rarity = getSelectedRarities();
        const sort_by = currentSort.by;
        const sort_order = currentSort.order;
        limit = rowsPerPageSelect ? parseInt(rowsPerPageSelect.value, 10) : 100;

        const url = `/api/cards?page=${currentPage}&limit=${limit}&sort_by=${sort_by}&sort_order=${sort_order}&search=${encodeURIComponent(search)}&rarity=${encodeURIComponent(rarity)}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`);
            }
            const data = await response.json();
            renderTable(data.cards);
            renderPagination(data);
        } catch (error) {
            console.error("Detailed error fetching cards:", error);
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center">Error loading data. See browser console for details.</td></tr>`;
            if (paginationControls) paginationControls.innerHTML = '';
        }
    }

    async function fetchRarityCounts() {
        try {
            const response = await fetch('/api/rarity-counts');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const rarityData = await response.json();
            populateRarityFilter(rarityData);
            renderRarityPieChart(rarityData);
            renderSummaryStats(rarityData);
        } catch (error) {
            console.error("Failed to fetch rarity counts:", error);
        }
    }

    async function fetchRarityByAccount() {
        try {
            const url = `/api/rarity-by-account?page=${rarityCurrentPage}&limit=${rarityLimit}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            renderRarityByAccountTable(data.data);
            renderRarityPagination(data);
        } catch (error) {
            console.error("Failed to fetch rarity by account:", error);
        }
    }

    // --- Rendering ---
    function renderTable(cards) {
        tableBody.innerHTML = '';
        if (!cards || cards.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center">No cards found.</td></tr>`;
            return;
        }
        cards.forEach(card => {
            let row = tableBody.insertRow();
            row.insertCell(0).innerHTML = card.image_url ? `<img src="${card.image_url}" alt="${card.card_name}" class="card-img-top" style="width: 50px;">` : 'N/A';
            row.insertCell(1).textContent = card.card_name;
            row.insertCell(2).innerHTML = getRarityIcon(card.rarity);
            // Correctly access device_account
            row.insertCell(3).textContent = card.deviceAccount;
        });
    }

    function renderRarityPieChart(data) {
        const labels = data.map(item => item.rarity);
        const counts = data.map(item => item.count);
        if (rarityPieChart) rarityPieChart.destroy();

        // Generate a color palette
        const colors = labels.map((_, i) => `hsl(${(i * 360 / labels.length)}, 70%, 60%)`);

        rarityPieChart = new Chart(rarityPieChartCtx, {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    label: 'Rarity Distribution',
                    data: counts,
                    backgroundColor: colors,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // Disable default legend
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(2);
                                    label += `${context.raw} (${percentage}%)`;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
        generateCustomLegend(labels, colors);
    }

    function generateCustomLegend(labels, colors) {
        rarityPieChartLegend.innerHTML = '';
        labels.forEach((label, index) => {
            const legendItem = document.createElement('div');
            legendItem.classList.add('chart-legend-item');
            legendItem.innerHTML = `
                <span class="chart-legend-color" style="background-color: ${colors[index]}"></span>
                ${getRarityIcon(label)}
            `;
            rarityPieChartLegend.appendChild(legendItem);
        });
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

    function renderSummaryStats(rarityData) {
        summaryStatsContainer.innerHTML = '';
        const totalCards = rarityData.reduce((sum, item) => sum + item.count, 0);
        const createStatCard = (title, count) => {
            let statDiv = document.createElement('div');
            statDiv.className = 'col-4 col-md-3 col-lg-2 mb-3';
            statDiv.innerHTML = `
                <div class="card text-center h-100">
                    <div class="card-body">
                        <h6 class="card-title text-muted">${getRarityIcon(title)}</h6>
                        <p class="card-text">${count}</p>
                    </div>
                </div>`;
            return statDiv;
        };
        summaryStatsContainer.appendChild(createStatCard('Total Cards', totalCards));
        rarityData.forEach(item => summaryStatsContainer.appendChild(createStatCard(item.rarity, item.count)));
    }

    function populateRarityFilter(data) {
        const sortOrder = [
            'Crown', 'Three Star', 'Two Star', 'One Star',
            'Two Shiny', 'One Shiny',
            'Four Diamond', 'Three Diamond', 'Two Diamond', 'One Diamond'
        ];

        data.sort((a, b) => {
            const indexA = sortOrder.indexOf(a.rarity);
            const indexB = sortOrder.indexOf(b.rarity);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        rarityFilterContainer.innerHTML = '';
        data.forEach(item => {
            const div = document.createElement('div');
            const rarityClass = item.rarity.toLowerCase().replace(/\s+/g, '-');
            div.className = `form-check form-switch rarity-toggle-${rarityClass}`;
            const rarityId = item.rarity.replace(/\s+/g, '');
            div.innerHTML = `<input class="form-check-input" type="checkbox" value="${item.rarity}" id="rarity-${rarityId}"><label class="form-check-label" for="rarity-${rarityId}">${getRarityIcon(item.rarity)}</label>`;
            rarityFilterContainer.appendChild(div);
        });
    }

    function renderRarityByAccountTable(data) {
        const tableData = data;
        if (Object.keys(tableData).length === 0) {
            rarityByAccountTableHead.innerHTML = '<tr><th>No data available</th></tr>';
            rarityByAccountTableBody.innerHTML = '';
            return;
        }

        // Collect all unique rarities for the header
        const allRarities = new Set();
        Object.values(tableData).forEach(rarities => {
            Object.keys(rarities).forEach(r => allRarities.add(r));
        });
        const sortedRarities = Array.from(allRarities).sort();

        // Create header
        let headerHtml = '<tr><th>Device Account</th>';
        sortedRarities.forEach(rarity => {
            headerHtml += `<th>${getRarityIcon(rarity)}</th>`;
        });
        headerHtml += '</tr>';
        rarityByAccountTableHead.innerHTML = headerHtml;

        // Create body
        let bodyHtml = '';
        for (const account in tableData) {
            bodyHtml += `<tr><td>${account}</td>`;
            sortedRarities.forEach(rarity => {
                bodyHtml += `<td>${tableData[account][rarity] || 0}</td>`;
            });
            bodyHtml += '</tr>';
        }
        rarityByAccountTableBody.innerHTML = bodyHtml;
    }

    function renderPagination(data) {
        const { total_pages, page: localCurrentPage } = data;
        paginationControls.innerHTML = '';
        if (total_pages <= 1) return;
        const ul = document.createElement('ul');
        ul.className = 'pagination';
        const createPageItem = (page, text = page, disabled = false, active = false) => {
            const li = document.createElement('li');
            li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" data-page="${page}">${text}</a>`;
            return li;
        };
        ul.appendChild(createPageItem(localCurrentPage - 1, 'Previous', localCurrentPage === 1));
        
        for (let i = 1; i <= total_pages; i++) {
            if (i === localCurrentPage || i === 1 || i === total_pages || (i >= localCurrentPage - 2 && i <= localCurrentPage + 2)) {
                 ul.appendChild(createPageItem(i, i, false, i === localCurrentPage));
            } else if (i === localCurrentPage - 3 || i === localCurrentPage + 3) {
                ul.appendChild(createPageItem(0, '...', true));
            }
        }
        ul.appendChild(createPageItem(localCurrentPage + 1, 'Next', localCurrentPage === total_pages));
        paginationControls.appendChild(ul);
    }

    function renderRarityPagination(data) {
        const { total_pages, page: localCurrentPage } = data;
        rarityPaginationControls.innerHTML = '';
        if (total_pages <= 1) return;
        const ul = document.createElement('ul');
        ul.className = 'pagination';
        const createPageItem = (page, text = page, disabled = false, active = false) => {
            const li = document.createElement('li');
            li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" data-rarity-page="${page}">${text}</a>`;
            return li;
        };
        ul.appendChild(createPageItem(localCurrentPage - 1, 'Previous', localCurrentPage === 1));
        
        for (let i = 1; i <= total_pages; i++) {
            if (i === localCurrentPage || i === 1 || i === total_pages || (i >= localCurrentPage - 2 && i <= localCurrentPage + 2)) {
                 ul.appendChild(createPageItem(i, i, false, i === localCurrentPage));
            } else if (i === localCurrentPage - 3 || i === localCurrentPage + 3) {
                ul.appendChild(createPageItem(0, '...', true));
            }
        }
        ul.appendChild(createPageItem(localCurrentPage + 1, 'Next', localCurrentPage === total_pages));
        rarityPaginationControls.appendChild(ul);
    }

    function getSelectedRarities() {
        return Array.from(document.querySelectorAll('#rarity-filter input:checked')).map(cb => cb.value).join(',');
    }

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // --- Event Listeners ---
    const debouncedFetch = debounce(() => {
        currentPage = 1;
        fetchCards();
    }, 300);

    searchInput.addEventListener('input', debouncedFetch);
    rarityFilterContainer.addEventListener('change', debouncedFetch);
    if (rowsPerPageSelect) {
        rowsPerPageSelect.addEventListener('change', () => {
            limit = parseInt(rowsPerPageSelect.value, 10);
            debouncedFetch();
        });
    }

    if (rarityRowsPerPageSelect) {
        rarityRowsPerPageSelect.addEventListener('change', () => {
            rarityLimit = parseInt(rarityRowsPerPageSelect.value, 10);
            rarityCurrentPage = 1;
            fetchRarityByAccount();
        });
    }

    tableHeader.addEventListener('click', e => {
        const header = e.target.closest('.sortable');
        if (!header) return;

        const newSortBy = header.dataset.sort;
        
        if (newSortBy === currentSort.by) {
            currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.by = newSortBy;
            currentSort.order = 'asc';
        }
        
        currentPage = 1;
        updateSortUI();
        fetchCards();
    });
    
    function updateSortUI() {
        document.querySelectorAll('.sortable').forEach(th => {
            const icon = th.querySelector('.bi');
            th.classList.remove('asc', 'desc');
            if (th.dataset.sort === currentSort.by) {
                th.classList.add(currentSort.order);
                icon.className = currentSort.order === 'asc' ? 'bi bi-arrow-up' : 'bi bi-arrow-down';
            } else {
                icon.className = 'bi bi-arrow-down-up';
            }
        });
    }

    paginationControls.addEventListener('click', e => {
        e.preventDefault();
        const pageLink = e.target.closest('[data-page]');
        if (pageLink) {
            const page = parseInt(pageLink.dataset.page, 10);
            if (!isNaN(page) && page > 0) {
                currentPage = page;
                fetchCards();
            }
        }
    });

    rarityPaginationControls.addEventListener('click', e => {
        e.preventDefault();
        const pageLink = e.target.closest('[data-rarity-page]');
        if (pageLink) {
            const page = parseInt(pageLink.dataset.rarityPage, 10);
            if (!isNaN(page) && page > 0) {
                rarityCurrentPage = page;
                fetchRarityByAccount();
            }
        }
    });
    
    tableBody.addEventListener('mouseover', e => {
        if (e.target.tagName === 'IMG') {
            imageTooltip.style.display = 'block';
            imageTooltip.querySelector('img').src = e.target.src;
        }
    });
    tableBody.addEventListener('mouseout', () => { imageTooltip.style.display = 'none'; });
    tableBody.addEventListener('mousemove', e => {
        if (imageTooltip.style.display === 'block') {
            imageTooltip.style.left = `${e.pageX + 15}px`;
            imageTooltip.style.top = `${e.pageY + 15}px`;
        }
    });

    // --- Initial Load ---
    function initializeDashboard() {
        fetchRarityCounts().then(() => {
            fetchCards();
        });
        fetchRarityByAccount();
        updateSortUI();
    }

    initializeDashboard();
});
    // --- Sidebar Toggle ---
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }