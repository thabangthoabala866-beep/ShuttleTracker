// ===== Bus Detail JavaScript - CPUT ShuttleTracker =====

let map;
let busMarker;
let routeLine;
let stopMarkers = [];
let updateInterval;
let currentBusId;

// Initialize the bus tracking map
function initializeBusMap(lat, lng, busId) {
    currentBusId = busId;
    
    // Initialize map centered on bus location
    map = L.map('busMap', {
        center: [lat, lng],
        zoom: 13,
        zoomControl: true
    });
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Create custom bus icon
    const busIcon = L.divIcon({
        html: `<div class="bus-marker-icon">
                <i class="fas fa-bus"></i>
               </div>`,
        className: 'custom-bus-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
    
    // Add bus marker
    busMarker = L.marker([lat, lng], { icon: busIcon }).addTo(map);
    busMarker.bindPopup(`
        <div class="map-popup">
            <strong>Current Location</strong><br>
            <span class="text-muted">Updated just now</span>
        </div>
    `).openPopup();
    
    // Add bus location styles
    const style = document.createElement('style');
    style.textContent = `
        .custom-bus-marker {
            background: transparent !important;
            border: none !important;
        }
        .bus-marker-icon {
            background: #003366;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(0, 51, 102, 0.7); }
            70% { box-shadow: 0 0 0 15px rgba(0, 51, 102, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 51, 102, 0); }
        }
        .map-popup {
            text-align: center;
            padding: 5px;
        }
    `;
    document.head.appendChild(style);
    
    // Load route and stops
    loadRouteOnMap(busId);
    
    // Start auto-updating bus location
    updateInterval = setInterval(() => updateBusLocation(busId), 30000);
    
    // Scroll to map if URL has #map hash
    if (window.location.hash === '#map') {
        document.getElementById('busMap').scrollIntoView({ behavior: 'smooth' });
    }
}

// Load entire route with stops on map
async function loadRouteOnMap(busId) {
    try {
        const busData = await ShuttleUtils.apiRequest(`/api/bus/${busId}`);
        
        // Clear existing markers
        stopMarkers.forEach(marker => map.removeLayer(marker));
        stopMarkers = [];
        
        // Create route path coordinates
        const routeCoordinates = busData.stops.map(stop => [stop.latitude, stop.longitude]);
        
        // Draw route line
        if (routeLine) map.removeLayer(routeLine);
        routeLine = L.polyline(routeCoordinates, {
            color: '#003366',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(map);
        
        // Add stop markers
        const stopIcons = {
            current: L.divIcon({
                html: '<i class="fas fa-bus" style="color: #28a745; font-size: 20px;"></i>',
                className: 'stop-icon',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            }),
            next: L.divIcon({
                html: '<i class="fas fa-circle" style="color: #ff9800; font-size: 12px;"></i>',
                className: 'stop-icon',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            }),
            regular: L.divIcon({
                html: '<i class="fas fa-circle" style="color: #6c757d; font-size: 8px;"></i>',
                className: 'stop-icon',
                iconSize: [8, 8],
                iconAnchor: [4, 4]
            })
        };
        
        busData.stops.forEach(stop => {
            let icon;
            if (stop.is_current) {
                icon = stopIcons.current;
            } else if (stop.is_next) {
                icon = stopIcons.next;
            } else {
                icon = stopIcons.regular;
            }
            
            const marker = L.marker([stop.latitude, stop.longitude], { icon })
                .addTo(map)
                .bindPopup(`
                    <div class="map-popup">
                        <strong>${stop.name}</strong><br>
                        <span>ETA: ${stop.eta}</span>
                        ${stop.is_current ? '<br><span class="badge badge-success">Current Stop</span>' : ''}
                        ${stop.is_next ? '<br><span class="badge badge-warning">Next Stop</span>' : ''}
                    </div>
                `);
            
            stopMarkers.push(marker);
        });
        
        // Fit map to show all stops
        const bounds = L.latLngBounds(routeCoordinates);
        map.fitBounds(bounds, { padding: [50, 50] });
        
    } catch (error) {
        console.error('Error loading route on map:', error);
    }
}

// Update bus location in real-time
async function updateBusLocation(busId) {
    try {
        const busData = await ShuttleUtils.apiRequest(`/api/bus/${busId}`);
        
        // Update marker position with animation
        const newLatLng = [busData.latitude, busData.longitude];
        busMarker.setLatLng(newLatLng);
        
        // Update popup content
        const updateTime = new Date().toLocaleTimeString('en-ZA', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        busMarker.setPopupContent(`
            <div class="map-popup">
                <strong>Current Location</strong><br>
                <span class="text-muted">Updated at ${updateTime}</span>
            </div>
        `);
        
        // Update status on page
        updateBusStatus(busData);
        
        // Update stop ETAs
        updateStopETAs(busData.stops);
        
        // Update passenger count
        updatePassengerCount(busData.passenger_count, busData.capacity);
        
        // Update last updated timestamp
        document.getElementById('lastUpdate').textContent = `Updated at ${updateTime}`;
        
    } catch (error) {
        console.error('Error updating bus location:', error);
    }
}

// Update bus status display
function updateBusStatus(busData) {
    const statusBadge = document.querySelector('.status-badge');
    if (statusBadge) {
        statusBadge.className = `status-badge status-${busData.status}`;
        statusBadge.innerHTML = `
            <i class="fas ${ShuttleUtils.getStatusIcon(busData.status)}"></i>
            ${busData.status.replace(/_/g, ' ').toUpperCase()}
        `;
    }
}

// Update stop ETA times
function updateStopETAs(stops) {
    const stopItems = document.querySelectorAll('.stop-item');
    stopItems.forEach((item, index) => {
        if (stops[index]) {
            const etaSpan = item.querySelector('.eta');
            if (etaSpan) {
                etaSpan.innerHTML = `<i class="fas fa-clock"></i> ETA: ${stops[index].eta}`;
            }
        }
    });
}

// Update passenger count
function updatePassengerCount(count, capacity) {
    const statValue = document.querySelector('.stat:nth-child(1) .stat-value');
    if (statValue) {
        statValue.textContent = `${count}/${capacity}`;
    }
}

// Share bus location
function shareBusLocation() {
    const busNumber = document.querySelector('.bus-header h1').textContent.trim();
    const mapCenter = map.getCenter();
    const shareUrl = `https://www.google.com/maps?q=${mapCenter.lat},${mapCenter.lng}`;
    
    if (navigator.share) {
        navigator.share({
            title: `CPUT ${busNumber} Location`,
            text: `Track ${busNumber} on CPUT ShuttleTracker`,
            url: shareUrl
        }).catch(console.error);
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareUrl).then(() => {
            ShuttleUtils.showNotification('Location link copied to clipboard!', 'success');
        });
    }
}

// Clean up on page leave
window.addEventListener('beforeunload', function() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    if (map) {
        map.remove();
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    if (map) {
        map.invalidateSize();
    }
});
