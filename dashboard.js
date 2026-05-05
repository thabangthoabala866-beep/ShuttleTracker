// ===== Dashboard JavaScript - CPUT ShuttleTracker =====

let refreshInterval;
let currentCampus = '';
let allBuses = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Set user's campus as default filter if available
    const userCampus = document.querySelector('meta[name="user-campus"]');
    if (userCampus) {
        currentCampus = userCampus.getAttribute('content');
        const filterSelect = document.getElementById('campusFilter');
        if (filterSelect) {
            filterSelect.value = currentCampus;
        }
    }
    
    loadBuses();
    
    // Auto-refresh every 30 seconds
    refreshInterval = setInterval(loadBuses, 30000);
    
    // Add keyboard shortcut for refresh
    document.addEventListener('keydown', function(e) {
        if (e.key === 'r' && e.ctrlKey) {
            e.preventDefault();
            loadBuses();
            ShuttleUtils.showNotification('Dashboard refreshed', 'info');
        }
    });
});

// Clean up on page leave
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

// Filter buses by campus
function filterByCampus() {
    currentCampus = document.getElementById('campusFilter').value;
    loadBuses();
    ShuttleUtils.showNotification(
        currentCampus ? `Showing buses for selected campus` : 'Showing all buses', 
        'info'
    );
}

// Load all buses
async function loadBuses() {
    const busGrid = document.getElementById('busGrid');
    
    try {
        let url = '/api/buses';
        if (currentCampus) {
            url += `?campus=${encodeURIComponent(currentCampus)}`;
        }
        
        allBuses = await ShuttleUtils.apiRequest(url);
        
        if (allBuses.length === 0) {
            busGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bus"></i>
                    <h3>No Active Buses</h3>
                    <p>There are currently no buses operating${currentCampus ? ' for this campus' : ''}.</p>
                    <p class="text-muted">Buses typically operate from 6:00 AM to 10:00 PM on weekdays.</p>
                </div>`;
            return;
        }
        
        // Render bus cards
        busGrid.innerHTML = allBuses.map(bus => createBusCard(bus)).join('');
        
        // Add event listeners
        attachBusCardListeners();
        
        // Update stats if they exist
        updateDashboardStats();
        
    } catch (error) {
        busGrid.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Unable to Load Buses</h3>
                <p>Please check your connection and try again.</p>
                <button onclick="loadBuses()" class="btn-primary">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>`;
        console.error('Error loading buses:', error);
    }
}

// Create individual bus card
function createBusCard(bus) {
    const statusClass = `status-${bus.status}`;
    const statusText = bus.status.replace(/_/g, ' ').toUpperCase();
    const capacityPercentage = Math.round((bus.passenger_count / bus.capacity) * 100);
    const capacityClass = capacityPercentage > 80 ? 'full' : capacityPercentage > 50 ? 'moderate' : 'empty';
    
    return `
        <div class="bus-card ${statusClass}" data-bus-id="${bus.id}">
            <div class="bus-card-header">
                <div>
                    <span class="bus-number">${bus.bus_number}</span>
                    <span class="driver-name">${bus.driver_name}</span>
                </div>
                <span class="status-badge ${statusClass}">
                    <i class="fas ${ShuttleUtils.getStatusIcon(bus.status)}"></i>
                    ${statusText}
                </span>
            </div>
            
            <div class="bus-route-info">
                <div class="route-stop">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${bus.origin}</span>
                </div>
                <div class="route-arrow">
                    <i class="fas fa-long-arrow-alt-right"></i>
                </div>
                <div class="route-stop">
                    <i class="fas fa-flag-checkered"></i>
                    <span>${bus.destination}</span>
                </div>
            </div>
            
            <div class="bus-progress">
                <div class="current-location">
                    <i class="fas fa-location-arrow"></i>
                    <span>${bus.current_stop}</span>
                </div>
                <div class="next-stop">
                    <i class="fas fa-arrow-right"></i>
                    <span>Next: ${bus.next_stop}</span>
                </div>
            </div>
            
            <div class="bus-capacity">
                <div class="capacity-bar">
                    <div class="capacity-fill ${capacityClass}" style="width: ${capacityPercentage}%"></div>
                </div>
                <div class="capacity-text">
                    <i class="fas fa-users"></i>
                    ${bus.passenger_count}/${bus.capacity} passengers
                </div>
            </div>
            
            <div class="bus-actions">
                <button class="btn-track" onclick="trackBus(${bus.id})">
                    <i class="fas fa-search-location"></i> Track Live
                </button>
                <button class="btn-info" onclick="viewBusDetails(${bus.id})">
                    <i class="fas fa-info-circle"></i> Details
                </button>
            </div>
        </div>
    `;
}

// Attach event listeners to bus cards
function attachBusCardListeners() {
    document.querySelectorAll('.bus-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Don't trigger if clicking buttons
            if (e.target.closest('button')) return;
            
            const busId = this.getAttribute('data-bus-id');
            viewBusDetails(busId);
        });
    });
}

// Navigate to bus detail page
function viewBusDetails(busId) {
    window.location.href = `/bus/${busId}`;
}

// Track specific bus (highlight on map or navigate)
function trackBus(busId) {
    window.location.href = `/bus/${busId}#map`;
}

// Update dashboard statistics
function updateDashboardStats() {
    const statsContainer = document.getElementById('busStats');
    if (!statsContainer) return;
    
    const stats = {
        total: allBuses.length,
        onTime: allBuses.filter(b => b.status === 'on_time').length,
        delayed: allBuses.filter(b => b.status === 'delayed').length,
        avgPassengers: Math.round(allBuses.reduce((sum, b) => sum + b.passenger_count, 0) / allBuses.length) || 0
    };
    
    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon total">
                <i class="fas fa-bus"></i>
            </div>
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Active Buses</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon on-time">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="stat-value">${stats.onTime}</div>
            <div class="stat-label">On Time</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon delayed">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="stat-value">${stats.delayed}</div>
            <div class="stat-label">Delayed</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon passengers">
                <i class="fas fa-users"></i>
            </div>
            <div class="stat-value">${stats.avgPassengers}</div>
            <div class="stat-label">Avg. Passengers</div>
        </div>
    `;
}
