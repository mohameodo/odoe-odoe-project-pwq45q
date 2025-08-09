document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT SELECTION ---
    const mapElement = document.getElementById('map');
    const toggleMarkerModeBtn = document.getElementById('toggle-marker-mode');
    const markerModeText = document.getElementById('marker-mode-text');
    const drawRouteBtn = document.getElementById('draw-route');
    const clearAllBtn = document.getElementById('clear-all');
    const markerList = document.getElementById('marker-list');
    const noMarkersMessage = document.getElementById('no-markers-message');

    // --- STATE MANAGEMENT ---
    let isAddingMarkers = false;
    let markers = [];
    let routePolyline = null;

    // --- MAP INITIALIZATION ---
    // Initialize map centered on a default location (e.g., San Francisco)
    const map = L.map('map', {
        zoomControl: false // We will add it in a different position
    }).setView([37.7749, -122.4194], 13);

    // Add a custom zoom control to the top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add a dark-themed tile layer from CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // --- UI UPDATE FUNCTIONS ---
    const updateButtonsState = () => {
        const hasMarkers = markers.length > 0;
        const canDrawRoute = markers.length >= 2;

        drawRouteBtn.disabled = !canDrawRoute;
        clearAllBtn.disabled = !hasMarkers;
    };

    const updateMarkerList = () => {
        markerList.innerHTML = ''; // Clear current list
        if (markers.length === 0) {
            markerList.appendChild(noMarkersMessage);
        } else {
            markers.forEach((markerData, index) => {
                const li = document.createElement('li');
                li.className = 'bg-gray-700/50 p-3 rounded-lg flex items-center justify-between animate-fade-in';
                li.innerHTML = `
                    <div class="flex items-center">
                        <span class="bg-blue-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mr-3">${index + 1}</span>
                        <span class="text-sm">Lat: ${markerData.latlng.lat.toFixed(4)}, Lng: ${markerData.latlng.lng.toFixed(4)}</span>
                    </div>
                    <button class="text-gray-400 hover:text-red-500 transition-colors remove-marker-btn" data-index="${index}">
                        <i class="fas fa-times-circle"></i>
                    </button>
                `;
                markerList.appendChild(li);
            });
        }
    };

    const redrawRoute = () => {
        if (routePolyline) {
            map.removeLayer(routePolyline);
            routePolyline = null;
        }
        if (markers.length >= 2) {
            const latlngs = markers.map(markerData => markerData.latlng);
            routePolyline = L.polyline(latlngs, { 
                color: '#2563eb', // blue-600
                weight: 4,
                opacity: 0.8,
            }).addTo(map);
        }
    };

    // --- EVENT HANDLERS ---
    const handleToggleMarkerMode = () => {
        isAddingMarkers = !isAddingMarkers;
        mapElement.classList.toggle('marker-cursor-enabled', isAddingMarkers);
        toggleMarkerModeBtn.classList.toggle('bg-yellow-500', isAddingMarkers);
        toggleMarkerModeBtn.classList.toggle('hover:bg-yellow-600', isAddingMarkers);
        toggleMarkerModeBtn.classList.toggle('bg-blue-600', !isAddingMarkers);
        toggleMarkerModeBtn.classList.toggle('hover:bg-blue-700', !isAddingMarkers);
        markerModeText.textContent = isAddingMarkers ? 'Stop Placing Markers' : 'Start Placing Markers';
    };

    const handleMapClick = (e) => {
        if (!isAddingMarkers) return;

        const latlng = e.latlng;
        const markerIndex = markers.length + 1;

        const customIcon = L.divIcon({
            html: `<div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-lg">${markerIndex}</div>`,
            className: '', // We use Tailwind classes in the HTML, so no extra class is needed here.
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        });

        const marker = L.marker(latlng, { icon: customIcon }).addTo(map);
        
        marker.bindPopup(`
            <div class="font-sans">
                <h3 class="font-bold text-lg mb-2 text-white">Marker ${markerIndex}</h3>
                <p class="text-sm"><strong>Lat:</strong> ${latlng.lat.toFixed(5)}</p>
                <p class="text-sm"><strong>Lng:</strong> ${latlng.lng.toFixed(5)}</p>
            </div>
        `).openPopup();
        
        markers.push({ marker, latlng });
        
        updateUI();
    };
    
    const handleDrawRoute = () => {
        if (markers.length < 2) return;
        redrawRoute();
        // Zoom to fit the route
        if(routePolyline) {
            map.fitBounds(routePolyline.getBounds().pad(0.1));
        }
    };
    
    const handleClearAll = () => {
        // Remove markers from map
        markers.forEach(markerData => map.removeLayer(markerData.marker));
        markers = [];
        
        // Remove polyline from map
        if (routePolyline) {
            map.removeLayer(routePolyline);
            routePolyline = null;
        }
        
        // Reset UI
        updateUI();
        // Reset map view
        map.setView([37.7749, -122.4194], 13);
    };

    const handleRemoveMarker = (e) => {
        if (e.target.closest('.remove-marker-btn')) {
            const indexToRemove = parseInt(e.target.closest('.remove-marker-btn').dataset.index, 10);
            
            // Remove from map
            map.removeLayer(markers[indexToRemove].marker);
            
            // Remove from array
            markers.splice(indexToRemove, 1);
            
            // Re-label remaining markers
            markers.forEach((markerData, index) => {
                const markerIndex = index + 1;
                const newIcon = L.divIcon({
                    html: `<div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-lg">${markerIndex}</div>`,
                    className: '',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                });
                markerData.marker.setIcon(newIcon);
                markerData.marker.unbindPopup().bindPopup(`
                    <div class="font-sans">
                        <h3 class="font-bold text-lg mb-2 text-white">Marker ${markerIndex}</h3>
                        <p class="text-sm"><strong>Lat:</strong> ${markerData.latlng.lat.toFixed(5)}</p>
                        <p class="text-sm"><strong>Lng:</strong> ${markerData.latlng.lng.toFixed(5)}</p>
                    </div>
                `);
            });

            redrawRoute();
            updateUI();
        }
    };

    const updateUI = () => {
        updateMarkerList();
        updateButtonsState();
    };

    // --- ATTACH EVENT LISTENERS ---
    toggleMarkerModeBtn.addEventListener('click', handleToggleMarkerMode);
    map.on('click', handleMapClick);
    drawRouteBtn.addEventListener('click', handleDrawRoute);
    clearAllBtn.addEventListener('click', handleClearAll);
    markerList.addEventListener('click', handleRemoveMarker);

    // --- INITIAL UI STATE ---
    updateUI();
});