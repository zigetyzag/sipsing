// Sipsing DJ Manager Application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the app
    initializeApp();
});

// Application state
let appState = {
    spots: {},           // Tables and bar seats
    songQueue: [],       // Songs waiting to be performed
    history: [],         // History of performed songs
    currentSinging: null, // Currently performing song
    timeElapsed: 0,      // Time elapsed for current song (in seconds)
    timer: null,         // Timer for current song
    timeIsUp: false      // Flag for when 3 minutes have passed
};

// Main function to initialize the app
function initializeApp() {
    const appElement = document.getElementById('app');
    
    // Create the main UI structure
    appElement.innerHTML = `
        <header class="header">
            <h1>Sipsing DJ Manager</h1>
        </header>
        
        <div class="nav nav-tabs mb-3">
            <button class="tab-button active" data-tab="queue">Now Playing</button>
            <button class="tab-button" data-tab="tables">Seats & Billing</button>
            <button class="tab-button" data-tab="history">History</button>
        </div>
        
        <div id="tab-content" class="tab-content">
            <div id="queue-tab" class="tab-pane active">
                <p>Loading queue data...</p>
            </div>
            <div id="tables-tab" class="tab-pane" style="display:none;">
                <p>Loading tables data...</p>
            </div>
            <div id="history-tab" class="tab-pane" style="display:none;">
                <p>Loading history data...</p>
            </div>
        </div>
    `;
    
    // Set up tab switching
    setupTabs();
    
    // Load data from localStorage or initialize if not exists
    loadAppData();
    
    // Build the UI for each tab
    buildQueueTab();
    buildTablesTab();
    buildHistoryTab();
}

// Set up tab switching functionality
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and hide all panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.style.display = 'none');
            
            // Add active class to clicked button and show corresponding pane
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).style.display = 'block';
        });
    });
}

// Load application data from localStorage
function loadAppData() {
    // Try to load data from localStorage
    const savedData = localStorage.getItem('sipsingDJManager');
    
    if (savedData) {
        // Parse saved data
        const parsed = JSON.parse(savedData);
        
        // Update app state with saved data
        appState.spots = parsed.spots || {};
        appState.songQueue = parsed.songQueue || [];
        appState.history = parsed.history || [];
        appState.currentSinging = parsed.currentSinging;
        appState.timeElapsed = parsed.timeElapsed || 0;
        appState.timeIsUp = parsed.timeIsUp || false;
    } else {
        // Initialize default data if no saved data exists
        initializeDefaultData();
    }
    
    // Start timer if there's a current song
    if (appState.currentSinging) {
        startSongTimer();
    }
}

// Initialize default data
function initializeDefaultData() {
    // Create tables
    for (let i = 1; i <= 10; i++) {
        appState.spots[`table_${i}`] = {
            id: `table_${i}`,
            name: `Table ${i}`,
            occupant: '',
            performedCount: 0
        };
    }
    
    // Create bar seats
    for (let i = 1; i <= 10; i++) {
        appState.spots[`bar_${i}`] = {
            id: `bar_${i}`,
            name: `Bar ${i}`,
            occupant: '',
            performedCount: 0
        };
    }
    
    // Empty song queue and history
    appState.songQueue = [];
    appState.history = [];
    appState.currentSinging = null;
    
    // Save initial data
    saveAppData();
}

// Save application data to localStorage
function saveAppData() {
    localStorage.setItem('sipsingDJManager', JSON.stringify(appState));
}

// Build the Queue Tab UI
function buildQueueTab() {
    const queueTab = document.getElementById('queue-tab');
    
    queueTab.innerHTML = `
        <div class="card mb-3">
            <div class="card-body">
                <h2 class="card-title">Add Songs to Queue</h2>
                <div id="add-song-form">
                    <div class="mb-3">
                        <select id="spot-select" class="form-select">
                            <option value="">Select a Seat</option>
                            <optgroup label="Tables">
                                ${Object.values(appState.spots)
                                    .filter(spot => spot.id.startsWith('table_'))
                                    .map(spot => `<option value="${spot.id}">${spot.occupant ? `${spot.name} (by: ${spot.occupant})` : spot.name}</option>`)
                                    .join('')}
                            </optgroup>
                            <optgroup label="Bar Seats">
                                ${Object.values(appState.spots)
                                    .filter(spot => spot.id.startsWith('bar_'))
                                    .map(spot => `<option value="${spot.id}">${spot.occupant ? `${spot.name} (by: ${spot.occupant})` : spot.name}</option>`)
                                    .join('')}
                            </optgroup>
                        </select>
                    </div>
                    <div id="song-inputs" style="display:none;">
                        <div class="mb-3">
                            <label for="song1" class="form-label">Song 1</label>
                            <input type="text" id="song1" class="form-control" placeholder="Song Name">
                        </div>
                        <div class="mb-3">
                            <label for="song2" class="form-label">Song 2 (Optional)</label>
                            <input type="text" id="song2" class="form-control" placeholder="Song Name">
                        </div>
                        <button id="add-songs-btn" class="btn btn-primary w-100">Add Song(s)</button>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="now-singing-container">
            <!-- Current song will be displayed here -->
        </div>
        
        <div id="next-song-container" class="mb-3">
            <!-- Next song info will be displayed here -->
        </div>
        
        <div class="card">
            <div class="card-body">
                <h2 class="card-title">Song Queue</h2>
                <div id="song-queue-table">
                    <!-- Queue will be displayed here -->
                </div>
            </div>
        </div>
    `;
    
    // Update displays
    updateNowSingingDisplay();
    updateQueueDisplay();
    
    // Set up event listeners for the add song form
    setupAddSongForm();
}

// Set up the add song form
function setupAddSongForm() {
    const spotSelect = document.getElementById('spot-select');
    const songInputs = document.getElementById('song-inputs');
    const song1Input = document.getElementById('song1');
    const song2Input = document.getElementById('song2');
    const addSongsBtn = document.getElementById('add-songs-btn');
    
    // Show/hide song inputs based on spot selection
    spotSelect.addEventListener('change', function() {
        if (spotSelect.value) {
            songInputs.style.display = 'block';
        } else {
            songInputs.style.display = 'none';
        }
    });
    
    // Add songs to queue when button is clicked
    addSongsBtn.addEventListener('click', function() {
        const spotId = spotSelect.value;
        const song1 = song1Input.value.trim();
        const song2 = song2Input.value.trim();
        
        if (!spotId) {
            alert('Please select a seat');
            return;
        }
        
        if (!song1 && !song2) {
            alert('Please enter at least one song');
            return;
        }
        
        const currentTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Add songs to queue
        if (song1) {
            appState.songQueue.push({
                spotId,
                songName: song1,
                time: currentTime
            });
        }
        
        if (song2) {
            appState.songQueue.push({
                spotId,
                songName: song2,
                time: currentTime
            });
        }
        
        // Reset form
        spotSelect.value = '';
        song1Input.value = '';
        song2Input.value = '';
        songInputs.style.display = 'none';
        
        // Save data and update displays
        saveAppData();
        updateQueueDisplay();
    });
}

// Update the Now Singing display
function updateNowSingingDisplay() {
    const nowSingingContainer = document.getElementById('now-singing-container');
    const nextSongContainer = document.getElementById('next-song-container');
    
    // Display current song if exists
    if (appState.currentSinging) {
        const bgClass = appState.timeIsUp ? 'time-warning' : 'now-singing';
        
        nowSingingContainer.innerHTML = `
            <div class="card ${bgClass} mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="card-title">Now Singing</h2>
                            <p class="card-text fs-5">
                                ${getSpotDisplay(appState.currentSinging.spotId)} - ${appState.currentSinging.songName}
                            </p>
                            <div class="d-flex align-items-center gap-2 mt-2">
                                <div class="bg-white bg-opacity-30 px-2 py-1 rounded">
                                    ${formatTime(appState.timeElapsed)} / 3:00
                                </div>
                                <span class="badge bg-success">Song Counted ✓</span>
                            </div>
                        </div>
                        <button class="btn btn-light text-primary" onclick="markAsCompleted()">
                            Mark Completed
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Display next song if exists and time is up
        if (appState.songQueue.length > 0 && appState.timeIsUp) {
            const nextSong = appState.songQueue[0];
            nextSongContainer.innerHTML = `
                <div class="card next-up">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h3 class="card-title text-primary">Up Next</h3>
                                <p class="card-text">
                                    ${getSpotDisplay(nextSong.spotId)} - ${nextSong.songName}
                                </p>
                            </div>
                            <button class="btn btn-primary" onclick="startNextSong()">
                                Start Next
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            nextSongContainer.innerHTML = '';
        }
    } else {
        nowSingingContainer.innerHTML = '';
        
        // Display next song if exists but no current song
        if (appState.songQueue.length > 0) {
            const nextSong = appState.songQueue[0];
            nextSongContainer.innerHTML = `
                <div class="card bg-success bg-opacity-25 border-success mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h3 class="card-title text-success">Next Song Ready</h3>
                                <p class="card-text fs-5">
                                    ${getSpotDisplay(nextSong.spotId)} - ${nextSong.songName}
                                </p>
                            </div>
                            <button class="btn btn-success" onclick="startCurrentSong('${nextSong.spotId}', '${nextSong.songName}')">
                                Start Now
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            nextSongContainer.innerHTML = '';
        }
    }
}

// Update the song queue display
function updateQueueDisplay() {
    const songQueueTable = document.getElementById('song-queue-table');
    
    if (appState.songQueue.length === 0) {
        songQueueTable.innerHTML = `<p class="text-center text-muted py-3">No songs in queue</p>`;
        return;
    }
    
    // Build the queue table
    let tableHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th class="text-center" style="width: 80px;">Order</th>
                        <th>Song</th>
                        <th style="width: 180px;">Seat</th>
                        <th class="text-center" style="width: 100px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    appState.songQueue.forEach((item, index) => {
        tableHTML += `
            <tr>
                <td class="text-center">
                    <div class="d-flex justify-content-center gap-1">
                        ${index > 0 ? `
                            <button class="btn btn-sm btn-outline-primary" onclick="moveSongUp(${index})">↑</button>
                        ` : ''}
                        ${index < appState.songQueue.length - 1 ? `
                            <button class="btn btn-sm btn-outline-primary" onclick="moveSongDown(${index})">↓</button>
                        ` : ''}
                    </div>
                </td>
                <td>
                    <input type="text" class="form-control" value="${item.songName}" 
                           onchange="updateSongName(${index}, this.value)">
                </td>
                <td class="text-muted small">${getSpotDisplay(item.spotId)}</td>
                <td class="text-center">
                    <div class="d-flex justify-content-center gap-2">
                        <button class="btn btn-sm btn-success" onclick="startCurrentSong('${item.spotId}', '${item.songName}')">▶</button>
                        ${index > 0 ? `
                            <button class="btn btn-sm btn-danger" onclick="boostSongToTop('${item.spotId}', '${item.songName}')">$</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    songQueueTable.innerHTML = tableHTML;
}

// Helper function to get display name for a spot
function getSpotDisplay(spotId) {
    if (!appState.spots[spotId]) return spotId;
    return appState.spots[spotId].occupant 
        ? `${appState.spots[spotId].name} (by: ${appState.spots[spotId].occupant})`
        : appState.spots[spotId].name;
}

// Format time for display (MM:SS)
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Start the current song
function startCurrentSong(spotId, songName) {
    // Clear any existing timer
    if (appState.timer) {
        clearInterval(appState.timer);
        appState.timer = null;
    }
    
    // If something is currently playing, mark it as complete
    if (appState.currentSinging) {
        markAsCompleted();
    }
    
    // Find and remove song from queue
    const index = appState.songQueue.findIndex(item => 
        item.spotId === spotId && item.songName === songName
    );
    
    if (index === -1) return;
    
    const queueItem = appState.songQueue[index];
    appState.songQueue.splice(index, 1);
    
    // Add to billing count
    if (appState.spots[spotId]) {
        appState.spots[spotId].performedCount = (appState.spots[spotId].performedCount || 0) + 1;
    }
    
    // Create history item
    const performanceId = Date.now();
    const startTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const historyItem = {
        id: performanceId,
        spotId,
        spotName: appState.spots[spotId]?.name || 'Unknown',
        occupant: appState.spots[spotId]?.occupant || 'Unknown',
        songName,
        orderedTime: queueItem.time || startTime,
        startTime,
        status: 'playing'
    };
    
    // Add to history and set as current
    appState.history.unshift(historyItem);
    appState.currentSinging = {
        id: performanceId,
        spotId,
        songName,
        orderedTime: queueItem.time || startTime,
        startTime
    };
    
    // Reset timer state
    appState.timeElapsed = 0;
    appState.timeIsUp = false;
    
    // Start timer
    startSongTimer();
    
    // Save data and update displays
    saveAppData();
    updateNowSingingDisplay();
    updateQueueDisplay();
}

// Start the next song (called when "Start Next" is clicked)
function startNextSong() {
    if (appState.songQueue.length === 0) return;
    
    // Mark current song as complete
    markAsCompleted();
    
    // Start the next song
    const nextSong = appState.songQueue[0];
    startCurrentSong(nextSong.spotId, nextSong.songName);
}

// Mark the current song as completed
function markAsCompleted() {
    if (!appState.currentSinging) return;
    
    // Update history item
    appState.history = appState.history.map(item => 
        item.id === appState.currentSinging.id 
            ? { ...item, status: 'completed' }
            : item
    );
    
    // Clear current singing
    appState.currentSinging = null;
    
    // Clear timer
    if (appState.timer) {
        clearInterval(appState.timer);
        appState.timer = null;
    }
    
    appState.timeElapsed = 0;
    appState.timeIsUp = false;
    
    // Save data and update displays
    saveAppData();
    updateNowSingingDisplay();
    buildHistoryTab(); // Update history tab if visible
}

// Start the song timer
function startSongTimer() {
    // Clear any existing timer
    if (appState.timer) {
        clearInterval(appState.timer);
    }
    
    // Start new timer
    appState.timer = setInterval(() => {
        appState.timeElapsed++;
        
        // Check if 3 minutes have passed (180 seconds)
        if (appState.timeElapsed >= 180 && !appState.timeIsUp) {
            appState.timeIsUp = true;
            updateNowSingingDisplay(); // Update display when time is up
            saveAppData();
        }
        
        // Update the timer display every 5 seconds to save resources
        if (appState.timeElapsed % 5 === 0) {
            const timerDisplay = document.querySelector('#now-singing-container .bg-white');
            if (timerDisplay) {
                timerDisplay.textContent = `${formatTime(appState.timeElapsed)} / 3:00`;
            }
        }
    }, 1000);
}

// Update song name in queue
function updateSongName(index, newName) {
    if (index >= 0 && index < appState.songQueue.length) {
        appState.songQueue[index].songName = newName.trim();
        saveAppData();
    }
}

// Move song up in queue
function moveSongUp(index) {
    if (index <= 0 || index >= appState.songQueue.length) return;
    
    // Swap with previous song
    const temp = appState.songQueue[index];
    appState.songQueue[index] = appState.songQueue[index - 1];
    appState.songQueue[index - 1] = temp;
    
    // Save and update display
    saveAppData();
    updateQueueDisplay();
}

// Move song down in queue
function moveSongDown(index) {
    if (index < 0 || index >= appState.songQueue.length - 1) return;
    
    // Swap with next song
    const temp = appState.songQueue[index];
    appState.songQueue[index] = appState.songQueue[index + 1];
    appState.songQueue[index + 1] = temp;
    
    // Save and update display
    saveAppData();
    updateQueueDisplay();
}

// Boost song to top of queue
function boostSongToTop(spotId, songName) {
    const songIndex = appState.songQueue.findIndex(item => 
        item.spotId === spotId && item.songName === songName
    );
    
    // Don't boost if song is already at the top or not found
    if (songIndex <= 0) return;
    
    // Find song and move to top
    const songToBoost = appState.songQueue[songIndex];
    appState.songQueue.splice(songIndex, 1);
    appState.songQueue.unshift(songToBoost);
    
    // Record the boost in history
    const boostTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const boostHistoryItem = {
        id: Date.now(),
        spotId,
        spotName: appState.spots[spotId]?.name || 'Unknown',
        occupant: appState.spots[spotId]?.occupant || 'Unknown',
        songName,
        orderedTime: songToBoost.time || boostTime,
        startTime: boostTime,
        status: 'boosted',
        action: '$ Boosted to top'
    };
    
    appState.history.unshift(boostHistoryItem);
    
    // Save and update displays
    saveAppData();
    updateQueueDisplay();
    buildHistoryTab(); // Update history tab if visible
}

// Build the Tables Tab UI
function buildTablesTab() {
    const tablesTab = document.getElementById('tables-tab');
    
    tablesTab.innerHTML = `
        <div class="card mb-4">
            <div class="card-body">
                <h2 class="card-title">Seats & Billing</h2>
                
                <div class="alert alert-warning">
                    <strong>Note:</strong> Each song performed costs $2. Add these charges manually to the customer's bill.
                </div>
                
                <h3 class="mt-4">Tables</h3>
                <div class="table-responsive">
                    <table class="table table-bordered">
                        <thead class="table-light">
                            <tr>
                                <th>Seat</th>
                                <th>Occupant</th>
                                <th class="text-center">Songs</th>
                                <th class="text-center">Total</th>
                                <th class="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.values(appState.spots)
                                .filter(spot => spot.id.startsWith('table_'))
                                .map(spot => `
                                    <tr>
                                        <td class="fw-medium">${spot.name}</td>
                                        <td>
                                            <input type="text" class="form-control" 
                                                value="${spot.occupant || ''}" 
                                                onchange="updateSpotOccupant('${spot.id}', this.value)">
                                        </td>
                                        <td class="text-center">
                                            <input type="number" class="form-control text-center" style="width: 70px; margin: 0 auto;"
                                                value="${spot.performedCount || 0}" min="0"
                                                onchange="updateSpotCount('${spot.id}', this.value)">
                                        </td>
                                        <td class="text-center text-success fw-bold">
                                            $${((spot.performedCount || 0) * 2).toFixed(2)}
                                        </td>
                                        <td class="text-center">
                                            <button class="btn btn-sm btn-success" 
                                                onclick="markSpotAsPaid('${spot.id}')">Paid</button>
                                        </td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <h3 class="mt-4">Bar Seats</h3>
                <div class="table-responsive">
                    <table class="table table-bordered">
                        <thead class="table-light">
                            <tr>
                                <th>Seat</th>
                                <th>Occupant</th>
                                <th class="text-center">Songs</th>
                                <th class="text-center">Total</th>
                                <th class="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.values(appState.spots)
                                .filter(spot => spot.id.startsWith('bar_'))
                                .map(spot => `
                                    <tr>
                                        <td class="fw-medium">${spot.name}</td>
                                        <td>
                                            <input type="text" class="form-control" 
                                                value="${spot.occupant || ''}" 
                                                onchange="updateSpotOccupant('${spot.id}', this.value)">
                                        </td>
                                        <td class="text-center">
                                            <input type="number" class="form-control text-center" style="width: 70px; margin: 0 auto;"
                                                value="${spot.performedCount || 0}" min="0"
                                                onchange="updateSpotCount('${spot.id}', this.value)">
                                        </td>
                                        <td class="text-center text-success fw-bold">
                                            $${((spot.performedCount || 0) * 2).toFixed(2)}
                                        </td>
                                        <td class="text-center">
                                            <button class="btn btn-sm btn-success" 
                                                onclick="markSpotAsPaid('${spot.id}')">Paid</button>
                                        </td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Update spot occupant name
function updateSpotOccupant(spotId, newName) {
    if (appState.spots[spotId]) {
        appState.spots[spotId].occupant = newName.trim();
        saveAppData();
        
        // Update any displays that might show this spot
        if (document.getElementById('queue-tab').style.display !== 'none') {
            buildQueueTab();
        }
    }
}

// Update spot song count
function updateSpotCount(spotId, newCount) {
    if (appState.spots[spotId]) {
        const count = parseInt(newCount);
        if (!isNaN(count) && count >= 0) {
            appState.spots[spotId].performedCount = count;
            saveAppData();
            buildTablesTab();
        }
    }
}

// Mark a spot as paid (reset occupant and count)
function markSpotAsPaid(spotId) {
    if (appState.spots[spotId]) {
        appState.spots[spotId].occupant = '';
        appState.spots[spotId].performedCount = 0;
        saveAppData();
        buildTablesTab();
        
        // Update queue tab if visible
        if (document.getElementById('queue-tab').style.display !== 'none') {
            buildQueueTab();
        }
    }
}

// Build the History Tab UI
function buildHistoryTab() {
    const historyTab = document.getElementById('history-tab');
    
    // Calculate summary statistics
    const regularSongs = appState.history.filter(item => item.status !== 'boosted').length;
    const boostedSongs = appState.history.filter(item => item.status === 'boosted').length;
    const totalRevenue = regularSongs * 2;
    
    historyTab.innerHTML = `
        <div class="card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2 class="card-title">Song History</h2>
                    <button class="btn btn-danger" onclick="clearHistory()">
                        Clear History
                    </button>
                </div>
                
                ${appState.history.length === 0 ? 
                    `<p class="text-center text-muted py-4">No song history yet</p>` :
                    `
                    <div class="table-responsive">
                        <table class="table">
                            <thead class="table-light">
                                <tr>
                                    <th>Ordered</th>
                                    <th>Played</th>
                                    <th>Seat</th>
                                    <th>Occupant</th>
                                    <th>Song</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${appState.history.map(item => `
                                    <tr class="${item.status === 'boosted' ? 'table-danger bg-opacity-25
                                                 <tr class="${item.status === 'boosted' ? 'table-danger bg-opacity-25' : ''}">
                                        <td>${item.orderedTime || '-'}</td>
                                        <td>${item.startTime || '-'}</td>
                                        <td>${item.spotName || '-'}</td>
                                        <td>${item.occupant || '-'}</td>
                                        <td>
                                            ${item.songName || '-'} 
                                            ${item.status === 'boosted' ? '<span class="badge bg-danger">$ Boosted</span>' : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="card mt-4 bg-info bg-opacity-10 border-info">
                        <div class="card-body">
                            <h3 class="card-title text-info">Daily Summary</h3>
                            <p class="mb-0">
                                Total Songs: ${regularSongs}<br>
                                Total Regular Revenue: $${totalRevenue.toFixed(2)}<br>
                                Boosted Songs: ${boostedSongs}<br>
                                <small class="text-muted">(Revenue for boosts varies based on time and customer)</small>
                            </p>
                        </div>
                    </div>
                    `
                }
            </div>
        </div>
    `;
}

// Clear history
function clearHistory() {
    if (confirm('Are you sure you want to clear the entire history?')) {
        appState.history = [];
        saveAppData();
        buildHistoryTab();
    }
}

// Make all functions available globally
window.updateSongName = updateSongName;
window.moveSongUp = moveSongUp;
window.moveSongDown = moveSongDown;
window.boostSongToTop = boostSongToTop;
window.startCurrentSong = startCurrentSong;
window.startNextSong = startNextSong;
window.markAsCompleted = markAsCompleted;
window.updateSpotOccupant = updateSpotOccupant;
window.updateSpotCount = updateSpotCount;
window.markSpotAsPaid = markSpotAsPaid;
window.clearHistory = clearHistory;
