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
    const rarityTableContainer = document.getElementById('rarity-table-container');
    const rarityByAccountTableHead = document.getElementById('rarity-by-account-table-head');
    const rarityByAccountTableBody = document.getElementById('rarity-by-account-table-body');
    const paginationControls = document.getElementById('pagination-controls');
    const rowsPerPageSelect = document.getElementById('rows-per-page');
    const rarityRowsPerPageSelect = document.getElementById('rarity-rows-per-page');
    const rarityPaginationControls = document.getElementById('rarity-pagination-controls');
    const allCardsTableHead = document.querySelector('#cards-table-body').previousElementSibling;

    // --- State Management ---
    let rarityPieChart;
    let currentPage = 1;
    let limit = 100;
    let rarityCurrentPage = 1;
    let rarityLimit = 20;
    let raritySort = { by: 'deviceAccount', order: 'asc' };
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
            if (response.status === 401) {
                window.location.href = '/password.html';
                return;
            }
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
            if (response.status === 401) {
                window.location.href = '/password.html';
                return;
            }
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const rarityData = await response.json();
            populateRarityFilter(rarityData);
            renderRarityPieChart(rarityData);
            renderSummaryStats(rarityData);
            renderRarityTable(rarityData);
        } catch (error) {
            console.error("Failed to fetch rarity counts:", error);
        }
    }

    async function fetchRarityByAccount() {
        try {
            const sort_by = raritySort.by || 'deviceAccount';
            const sort_order = raritySort.order || 'asc';
            const url = `/api/rarity-by-account?page=${rarityCurrentPage}&limit=${rarityLimit}&sort_by=${sort_by}&sort_order=${sort_order}`;
            const response = await fetch(url);
            if (response.status === 401) {
                window.location.href = '/password.html';
                return;
            }
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

    function renderRarityTable(rarityData) {
        const totalCards = rarityData.reduce((sum, item) => sum + item.count, 0);
        let tableHtml = `
            <div class="card">
                <div class="card-header">
                    Rarity Distribution
                </div>
                <div class="card-body">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Rarity</th>
                                <th>Count</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        rarityData.forEach(item => {
            const percentage = totalCards > 0 ? ((item.count / totalCards) * 100).toFixed(2) : 0;
            tableHtml += `
                <tr>
                    <td>${getRarityIcon(item.rarity)}</td>
                    <td>${item.count}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });
        tableHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        rarityTableContainer.innerHTML = tableHtml;
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
        const raritiesForHeader = [
            'Crown', 'Three Star', 'Two Star', 'One Star',
            'Two Shiny', 'One Shiny',
            'Four Diamond', 'Three Diamond', 'Two Diamond', 'One Diamond'
        ];

        // Create header
        let headerHtml = '<tr><th class="sortable" data-sort="deviceAccount">Device Account <i class="bi bi-arrow-down-up"></i></th>';
        raritiesForHeader.forEach(rarity => {
            headerHtml += `<th class="sortable" data-sort="${rarity}">${getRarityIcon(rarity)} <i class="bi bi-arrow-down-up"></i></th>`;
        });
        headerHtml += '</tr>';
        rarityByAccountTableHead.innerHTML = headerHtml;

        if (Object.keys(tableData).length === 0) {
            rarityByAccountTableBody.innerHTML = '<tr><td colspan="11" class="text-center">No data available</td></tr>';
            return;
        }

        // Create body
        let bodyHtml = '';
        for (const account in tableData) {
            bodyHtml += `<tr><td>${account}</td>`;
            raritiesForHeader.forEach(rarity => {
                const count = tableData[account] && tableData[account][rarity] ? tableData[account][rarity] : 0;
                const cellClass = count > 0 ? 'has-cards' : '';
                bodyHtml += `<td class="${cellClass}" data-account="${account}" data-rarity="${rarity}">${count}</td>`;
            });
            bodyHtml += '</tr>';
        }
        rarityByAccountTableBody.innerHTML = bodyHtml;
        updateRaritySortUI();
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

    allCardsTableHead.addEventListener('click', e => {
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
        allCardsTableHead.querySelectorAll('.sortable').forEach(th => {
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

    function updateRaritySortUI() {
        document.querySelectorAll('#rarity-by-account-table-head .sortable').forEach(th => {
            const icon = th.querySelector('.bi');
            if (!icon) return;
            th.classList.remove('asc', 'desc');
            if (th.dataset.sort === raritySort.by) {
                th.classList.add(raritySort.order);
                icon.className = `bi bi-arrow-${raritySort.order === 'asc' ? 'up' : 'down'}`;
            } else {
                icon.className = 'bi bi-arrow-down-up';
            }
        });
    }

    rarityByAccountTableHead.addEventListener('click', e => {
        const header = e.target.closest('.sortable');
        if (!header) return;

        const newSortBy = header.dataset.sort;
        
        if (newSortBy === raritySort.by) {
            raritySort.order = raritySort.order === 'asc' ? 'desc' : 'asc';
        } else {
            raritySort.by = newSortBy;
            raritySort.order = 'desc';
        }
        
        rarityCurrentPage = 1;
        fetchRarityByAccount();
    });

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

    const cardDetailsModal = document.getElementById('card-details-modal');
    const cardDetailsContent = document.getElementById('card-details-content');
    let modalHideTimeout;

    rarityByAccountTableBody.addEventListener('mouseover', async (e) => {
        if (window.innerWidth < 992) return; // Disable on smaller screens

        if (e.target.matches('td.has-cards')) {
            if (modalHideTimeout) {
                clearTimeout(modalHideTimeout);
            }
            const cell = e.target;
            const account = cell.dataset.account;
            const rarity = cell.dataset.rarity;

            cardDetailsContent.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
            cardDetailsModal.style.display = 'block'; // Show modal first to calculate size

            try {
                const response = await fetch(`/api/cards-by-account-rarity?account=${encodeURIComponent(account)}&rarity=${encodeURIComponent(rarity)}`);
                if (!response.ok) throw new Error('Failed to fetch card details');
                
                const cards = await response.json();
                
                if (cards.length > 0) {
                    cardDetailsContent.innerHTML = `
                        <div class="card-details-grid">
                            ${cards.map(card => `
                                <div class="card-detail-item text-center">
                                    <img src="${card.image_url}" alt="${card.card_name}" class="img-fluid">
                                    <p class="mb-0">${card.card_name}</p>
                                </div>
                            `).join('')}
                        </div>
                    `;
                } else {
                    cardDetailsContent.innerHTML = '<p class="text-center">No cards found.</p>';
                }

                // Now position the modal correctly
                const rect = cell.getBoundingClientRect();
                const modalWidth = cardDetailsModal.offsetWidth;
                const modalHeight = cardDetailsModal.offsetHeight;
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                let left = rect.left + window.scrollX;
                let top = rect.bottom + window.scrollY + 5;

                // Adjust horizontal position
                if (left + modalWidth > viewportWidth + window.scrollX) {
                    left = rect.right + window.scrollX - modalWidth;
                }

                // Adjust vertical position
                if (top + modalHeight > viewportHeight + window.scrollY) {
                    top = rect.top + window.scrollY - modalHeight - 5;
                }
                
                // Ensure it doesn't go off the left or top of the screen
                if (left < window.scrollX) {
                    left = window.scrollX + 5;
                }
                if (top < window.scrollY) {
                    top = window.scrollY + 5;
                }

                cardDetailsModal.style.left = `${left}px`;
                cardDetailsModal.style.top = `${top}px`;
            } catch (error) {
                console.error('Error fetching card details:', error);
                cardDetailsContent.innerHTML = '<p class="text-center text-danger">Error loading details.</p>';
            }
        }
    });

    function hideModal() {
        modalHideTimeout = setTimeout(() => {
            cardDetailsModal.style.display = 'none';
        }, 1000); // A slightly longer delay
    }

    rarityByAccountTableBody.addEventListener('mouseout', (e) => {
        if (e.target.matches('td.has-cards')) {
            hideModal();
        }
    });

    cardDetailsModal.addEventListener('mouseenter', () => {
        clearTimeout(modalHideTimeout);
    });

    cardDetailsModal.addEventListener('mouseleave', () => {
        hideModal();
    });

    // --- Initial Load ---
    function initializeDashboard() {
        fetchRarityCounts().then(() => {
            fetchCards();
        });
        fetchRarityByAccount();
        updateSortUI();
        updateRaritySortUI();
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