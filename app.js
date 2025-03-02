// Sipsing DJ Manager Application
document.addEventListener('DOMContentLoaded', function() {
    // We'll implement the full application here
    initializeApp();
});

// Main function to initialize the app
function initializeApp() {
    const appElement = document.getElementById('app');
    
    // Replace the loading message with our app UI
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
                <p>Queue tab content loading...</p>
            </div>
            <div id="tables-tab" class="tab-pane" style="display:none;">
                <p>Tables tab content loading...</p>
            </div>
            <div id="history-tab" class="tab-pane" style="display:none;">
                <p>History tab content loading...</p>
            </div>
        </div>
    `;
    
    // Set up tab switching
    setupTabs();
    
    // Load initial data and setup
    loadAppData();
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

// Load application data
function loadAppData() {
    // For now, we'll use mock data
    // In the next steps, we'll replace this with localStorage or Firebase
    
    // Initialize tables and bar seats
    const spots = {};
    
    // Create tables
    for (let i = 1; i <= 10; i++) {
        spots[`table_${i}`] = {
            id: `table_${i}`,
            name: `Table ${i}`,
            occupant: '',
            performedCount: 0
        };
    }
    
    // Create bar seats
    for (let i = 1; i <= 10; i++) {
        spots[`bar_${i}`] = {
            id: `bar_${i}`,
            name: `Bar ${i}`,
            occupant: '',
            performedCount: 0
        };
    }
    
    // Initialize empty song queue and history
    const songQueue = [];
    const history = [];
    
    // Build the queue tab UI
    buildQueueTab(spots, songQueue, history);
    
    // Build the tables tab UI
    buildTablesTab(spots);
    
    // Build the history tab UI
    buildHistoryTab(history);
}

// Build the Queue Tab UI
function buildQueueTab(spots, songQueue, history) {
    const queueTab = document.getElementById('queue-tab');
    
    queueTab.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h2 class="card-title">Add Songs to Queue</h2>
                <div id="add-song-form">
                    <div class="mb-3">
                        <select id="spot-select" class="form-select">
                            <option value="">Select a Seat</option>
                            <optgroup label="Tables">
                                ${Object.values(spots)
                                    .filter(spot => spot.id.startsWith('table_'))
                                    .map(spot => `<option value="${spot.id}">${spot.occupant ? `${spot.name} (by: ${spot.occupant})` : spot.name}</option>`)
                                    .join('')}
                            </optgroup>
                            <optgroup label="Bar Seats">
                                ${Object.values(spots)
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
                    <p class="text-center text-muted">No songs in queue</p>
                </div>
            </div>
        </div>
    `;
    
    // Set up event listeners for the add song form
    setupAddSongForm(spots, songQueue);
}

// Setup the add song form functionality
function setupAddSongForm(spots, songQueue) {
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
            songQueue.push({
                spotId,
                songName: song1,
                time: currentTime
            });
        }
        
        if (song2) {
            songQueue.push({
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
        
        // Update the queue display
        updateQueueDisplay(spots, songQueue);
    });
}

// Update the song queue display
function updateQueueDisplay(spots, songQueue) {
    const songQueueTable = document.getElementById('song-queue-table');
    const nextSongContainer = document.getElementById('next-song-container');
    
    if (songQueue.length === 0) {
        songQueueTable.innerHTML = `<p class="text-center text-muted">No songs in queue</p>`;
        nextSongContainer.innerHTML = '';
        return;
    }
    
    // Display next song if no current song is playing
    const currentSinging = getCurrentSingingData();
    if (!currentSinging && songQueue.length > 0) {
        const nextSong = songQueue[0];
        nextSongContainer.innerHTML = `
            <div class="card bg-success bg-opacity-25 border-success">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h3 class="card-title text-success">Next Song Ready</h3>
                            <p class="card-text fs-5">
                                ${getSpotDisplay(spots, nextSong.spotId)} - ${nextSong.songName}
                            </p>
                        </div>
                        <button class="btn btn-success" onclick="startCurrentSong('${nextSong.spotId}', '${nextSong.songName}')">
                            Start Now
                        </button>
                    </div>
                </div>
            </div>
        `;
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
    
    songQueue.forEach((item, index) => {
        tableHTML += `
            <tr>
                <td class="text-center">
                    <div class="d-flex justify-content-center gap-1">
                        ${index > 0 ? `
                            <button class="btn btn-sm btn-outline-primary" onclick="moveSongUp(${index})">↑</button>
                        ` : ''}
                        ${index < songQueue.length - 1 ? `
                            <button class="btn btn-sm btn-outline-primary" onclick="moveSongDown(${index})">↓</button>
                        ` : ''}
                    </div>
                </td>
                <td>
                    <input type="text" class="form-control" value="${item.songName}" 
                           onchange="updateSongName(${index}, this.value)">
                </td>
                <td class="text-muted small">${getSpotDisplay(spots, item.spotId)}</td>
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
function getSpotDisplay(spots, spotId) {
    if (!spots[spotId]) return spotId;
    return spots[spotId].occupant 
        ? `${spots[spotId].name} (by: ${spots[spotId].occupant})`
        : spots[spotId].name;
}

// Temporarily add these functions to window so they can be called from HTML
window.updateSongName = function(index, newName) {
    // Will implement this in the next step
    console.log(`Update song at index ${index} to "${newName}"`);
}

window.moveSongUp = function(index) {
    // Will implement this in the next step
    console.log(`Move song up at index ${index}`);
}

window.moveSongDown = function(index) {
    // Will implement this in the next step
    console.log(`Move song down at index ${index}`);
}

window.boostSongToTop = function(spotId, songName) {
    // Will implement this in the next step
    console.log(`Boost song "${songName}" from spot "${spotId}" to top`);
}

window.startCurrentSong = function(spotId, songName) {
    // Will implement this in the next step
    console.log(`Start song "${songName}" from spot "${spotId}"`);
}

// Get current singing data (placeholder for now)
function getCurrentSingingData() {
    // Will implement this in the next step
    return null;
}

// Build the Tables Tab UI (placeholder for now)
function buildTablesTab(spots) {
    const tablesTab = document.getElementById('tables-tab');
    tablesTab.innerHTML = `
        <h2>Seats & Billing</h2>
        <p>This tab will show tables and billing information.</p>
    `;
}

// Build the History Tab UI (placeholder for now)
function buildHistoryTab(history) {
    const historyTab = document.getElementById('history-tab');
    historyTab.innerHTML = `
        <h2>Song History</h2>
        <p>This tab will show the song history.</p>
    `;
}
