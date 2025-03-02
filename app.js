// Import Firebase functions
import { 
  checkAuthState, 
  signIn, 
  signUp, 
  logOut, 
  saveVenueData, 
  getVenueData,
  addSongToDatabase,
  searchSongDatabase
} from './firebase.js';

// Application state
let appState = {
  currentUser: null,
  venueName: '',
  spots: {},
  songQueue: [],
  history: [],
  currentSinging: null,
  timeElapsed: 0,
  timer: null,
  timeIsUp: false,
  songDatabase: []
};

// Main function to initialize the app
document.addEventListener('DOMContentLoaded', function() {
  // Check authentication state
  checkAuthState((user) => {
    if (user) {
      // User is logged in
      appState.currentUser = user;
      loadVenueData(user.uid);
    } else {
      // User is not logged in, show login screen
      showLoginScreen();
    }
  });
});

// Show login screen
function showLoginScreen() {
  const appElement = document.getElementById('app');
  
  appElement.innerHTML = `
    <div class="row justify-content-center mt-5">
      <div class="col-md-6">
        <div class="card shadow">
          <div class="card-header bg-primary text-white">
            <h2 class="text-center mb-0">Sipsing DJ Manager</h2>
          </div>
          <div class="card-body">
            <ul class="nav nav-tabs" id="authTabs" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link active" id="login-tab" data-bs-toggle="tab" data-bs-target="#login" type="button" role="tab" aria-controls="login" aria-selected="true">Login</button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="register-tab" data-bs-toggle="tab" data-bs-target="#register" type="button" role="tab" aria-controls="register" aria-selected="false">Register</button>
              </li>
            </ul>
            <div class="tab-content p-3" id="authTabsContent">
              <div class="tab-pane fade show active" id="login" role="tabpanel" aria-labelledby="login-tab">
                <form id="login-form">
                  <div class="mb-3">
                    <label for="login-email" class="form-label">Email address</label>
                    <input type="email" class="form-control" id="login-email" required>
                  </div>
                  <div class="mb-3">
                    <label for="login-password" class="form-label">Password</label>
                    <input type="password" class="form-control" id="login-password" required>
                  </div>
                  <div id="login-error" class="alert alert-danger d-none"></div>
                  <button type="submit" class="btn btn-primary w-100">Login</button>
                </form>
              </div>
              <div class="tab-pane fade" id="register" role="tabpanel" aria-labelledby="register-tab">
                <form id="register-form">
                  <div class="mb-3">
                    <label for="register-email" class="form-label">Email address</label>
                    <input type="email" class="form-control" id="register-email" required>
                  </div>
                  <div class="mb-3">
                    <label for="register-password" class="form-label">Password</label>
                    <input type="password" class="form-control" id="register-password" required>
                    <div class="form-text">Password must be at least 6 characters long.</div>
                  </div>
                  <div class="mb-3">
                    <label for="venue-name" class="form-label">Venue Name</label>
                    <input type="text" class="form-control" id="venue-name" required>
                  </div>
                  <div id="register-error" class="alert alert-danger d-none"></div>
                  <button type="submit" class="btn btn-primary w-100">Register</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners for forms
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
}

// Handle login form submission
async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorElement = document.getElementById('login-error');
  
  // Show loading state
  const submitButton = event.target.querySelector('button[type="submit"]');
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';
  submitButton.disabled = true;
  errorElement.classList.add('d-none');
  
  // Attempt to sign in
  const result = await signIn(email, password);
  
  // Reset button
  submitButton.innerHTML = 'Login';
  submitButton.disabled = false;
  
  if (result.success) {
    // Login successful
    appState.currentUser = result.user;
    loadVenueData(result.user.uid);
  } else {
    // Login failed, show error
    errorElement.textContent = result.error;
    errorElement.classList.remove('d-none');
  }
}

// Handle register form submission
async function handleRegister(event) {
  event.preventDefault();
  
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const venueName = document.getElementById('venue-name').value;
  const errorElement = document.getElementById('register-error');
  
  // Show loading state
  const submitButton = event.target.querySelector('button[type="submit"]');
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registering...';
  submitButton.disabled = true;
  errorElement.classList.add('d-none');
  
  // Validate inputs
  if (password.length < 6) {
    errorElement.textContent = 'Password must be at least 6 characters long.';
    errorElement.classList.remove('d-none');
    submitButton.innerHTML = 'Register';
    submitButton.disabled = false;
    return;
  }
  
  // Attempt to sign up
  const result = await signUp(email, password, venueName);
  
  // Reset button
  submitButton.innerHTML = 'Register';
  submitButton.disabled = false;
  
  if (result.success) {
    // Registration successful
    appState.currentUser = result.user;
    appState.venueName = venueName;
    
    // Initialize default data
    initializeDefaultData();
    
    // Save venue data
    await saveVenueData(result.user.uid, {
      spots: appState.spots,
      songQueue: appState.songQueue,
      history: appState.history,
      currentSinging: appState.currentSinging,
      songDatabase: []
    });
    
    // Initialize the app UI
    initializeAppUI();
  } else {
    // Registration failed, show error
    errorElement.textContent = result.error;
    errorElement.classList.remove('d-none');
  }
}

// Load venue data from Firebase
async function loadVenueData(userId) {
  const result = await getVenueData(userId);
  
  if (result.success) {
    // Update app state with venue data
    appState.venueName = result.data.venueName || 'My Venue';
    appState.spots = result.data.spots || {};
    appState.songQueue = result.data.songQueue || [];
    appState.history = result.data.history || [];
    appState.currentSinging = result.data.currentSinging;
    appState.timeElapsed = result.data.timeElapsed || 0;
    appState.timeIsUp = result.data.timeIsUp || false;
    appState.songDatabase = result.data.songDatabase || [];
    
    // If spots object is empty, initialize with default
    if (Object.keys(appState.spots).length === 0) {
      initializeDefaultData();
      
      // Save the initialized data
      await saveVenueData(userId, {
        spots: appState.spots
      });
    }
    
    // Initialize the app UI
    initializeAppUI();
    
    // Start timer if there's a current song
    if (appState.currentSinging) {
      startSongTimer();
    }
  } else {
    // Error loading data
    console.error("Error loading venue data:", result.error);
    alert("Error loading venue data. Please try again later.");
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
}

// Initialize the app UI
function initializeAppUI() {
  const appElement = document.getElementById('app');
  
  appElement.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-purple-900">
      <div class="container-fluid">
        <a class="navbar-brand" href="#">${appState.venueName}</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav">
            <li class="nav-item">
              <a class="nav-link active" data-tab="queue" href="#">Now Playing</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" data-tab="tables" href="#">Seats & Billing</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" data-tab="history" href="#">History</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" data-tab="songs" href="#">Song Database</a>
            </li>
          </ul>
          <ul class="navbar-nav ms-auto">
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown">
                <i class="fas fa-user"></i> ${appState.currentUser.email}
              </a>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item" href="#" id="logout-button">Logout</a></li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
    
    <div class="container-fluid mt-3">
      <div id="tab-content">
        <div id="queue-tab" class="tab-pane active">
          <!-- Queue tab content will go here -->
        </div>
        <div id="tables-tab" class="tab-pane" style="display:none;">
          <!-- Tables tab content will go here -->
        </div>
        <div id="history-tab" class="tab-pane" style="display:none;">
          <!-- History tab content will go here -->
        </div>
        <div id="songs-tab" class="tab-pane" style="display:none;">
          <!-- Songs database tab content will go here -->
        </div>
      </div>
    </div>
  `;
  
  // Set up tab navigation
  document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Update active class on nav links
      document.querySelectorAll('.nav-link[data-tab]').forEach(l => l.classList.remove('active'));
      this.classList.add('active');
      
      // Hide all tab panes
      document.querySelectorAll('.tab-pane').forEach(pane => pane.style.display = 'none');
      
      // Show selected tab pane
      const tabId = this.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).style.display = 'block';
      
      // Build tab content if needed
      if (tabId === 'queue') buildQueueTab();
      if (tabId === 'tables') buildTablesTab();
      if (tabId === 'history') buildHistoryTab();
      if (tabId === 'songs') buildSongsTab();
    });
  });
  
  // Set up logout button
  document.getElementById('logout-button').addEventListener('click', async function(e) {
    e.preventDefault();
    
    const result = await logOut();
    if (result.success) {
      // Clear app state
      appState = {
        currentUser: null,
        venueName: '',
        spots: {},
        songQueue: [],
        history: [],
        currentSinging: null,
        timeElapsed: 0,
        timer: null,
        timeIsUp: false,
        songDatabase: []
      };
      
      // Show login screen
      showLoginScreen();
    } else {
      alert("Error logging out: " + result.error);
    }
  });
  
  // Build initial tab content
  buildQueueTab();
}

// Save data to Firebase
async function saveToFirebase(updates = {}) {
  if (!appState.currentUser) return;
  
  // Create data object with updates
  const data = {
    ...updates
  };
  
  // Add timestamp
  data.lastUpdated = new Date().toISOString();
  
  // Save to Firebase
  await saveVenueData(appState.currentUser.uid, data);
}

// Build the Queue Tab UI
function buildQueueTab() {
  const queueTab = document.getElementById('queue-tab');
  
  queueTab.innerHTML = `
    <div class="row">
      <div class="col-md-12 col-lg-4 mb-3">
        <div class="card shadow-sm">
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
                  <div class="input-group">
                    <input type="text" id="song1" class="form-control" placeholder="Song Name">
                    <button class="btn btn-outline-secondary" type="button" id="song1-search">
                      <i class="fas fa-search"></i>
                    </button>
                  </div>
                </div>
                <div class="mb-3">
                  <label for="song2" class="form-label">Song 2 (Optional)</label>
                  <div class="input-group">
                    <input type="text" id="song2" class="form-control" placeholder="Song Name">
                    <button class="btn btn-outline-secondary" type="button" id="song2-search">
                      <i class="fas fa-search"></i>
                    </button>
                  </div>
                </div>
                <button id="add-songs-btn" class="btn btn-primary w-100">
                  <i class="fas fa-plus-circle"></i> Add Song(s)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-12 col-lg-8">
        <div id="now-singing-container" class="mb-3">
          <!-- Current song will be displayed here -->
        </div>
        
        <div id="next-song-container" class="mb-3">
          <!-- Next song info will be displayed here -->
        </div>
        
        <div class="card shadow-sm">
          <div class="card-body">
            <h2 class="card-title">Song Queue</h2>
            <div id="song-queue-table">
              <!-- Queue will be displayed here -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Update displays
  updateNowSingingDisplay();
  updateQueueDisplay();
  
  // Set up event listeners for the add song form
  setupAddSongForm();
  
  // Set up song search modals
  setupSongSearch();
}
// Setup the add song form
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
    saveToFirebase({ songQueue: appState.songQueue });
    updateQueueDisplay();
  });
}

// Setup song search functionality
function setupSongSearch() {
  const song1SearchBtn = document.getElementById('song1-search');
  const song2SearchBtn = document.getElementById('song2-search');
  
  song1SearchBtn.addEventListener('click', () => showSongSearchModal('song1'));
  song2SearchBtn.addEventListener('click', () => showSongSearchModal('song2'));
}

// Show song search modal
function showSongSearchModal(targetInputId) {
  // Create modal if it doesn't exist
  if (!document.getElementById('songSearchModal')) {
    const modalHTML = `
      <div class="modal fade" id="songSearchModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Song Search</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="input-group mb-3">
                <input type="text" id="song-search-input" class="form-control" placeholder="Search songs...">
                <button class="btn btn-primary" id="song-search-button">
                  <i class="fas fa-search"></i> Search
                </button>
              </div>
              <div id="song-search-results" class="mt-3">
                <p class="text-center text-muted">Enter a search term above</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Setup search functionality
    document.getElementById('song-search-button').addEventListener('click', performSongSearch);
    document.getElementById('song-search-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        performSongSearch();
      }
    });
  }
  
  // Store target input ID
  document.getElementById('songSearchModal').setAttribute('data-target-input', targetInputId);
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('songSearchModal'));
  modal.show();
}

// Perform song search
async function performSongSearch() {
  const searchInput = document.getElementById('song-search-input');
  const searchResults = document.getElementById('song-search-results');
  const searchTerm = searchInput.value.trim();
  
  if (!searchTerm) {
    searchResults.innerHTML = '<p class="text-center text-muted">Please enter a search term</p>';
    return;
  }
  
  // Show loading indicator
  searchResults.innerHTML = `
    <div class="text-center">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p>Searching...</p>
    </div>
  `;
  
  // Search song database
  if (appState.currentUser) {
    const result = await searchSongDatabase(appState.currentUser.uid, searchTerm);
    
    if (result.success) {
      if (result.results.length > 0) {
        // Display results
        let html = `
          <div class="list-group">
        `;
        
        result.results.forEach(song => {
          html += `
            <button type="button" class="list-group-item list-group-item-action song-result" 
              data-song-title="${song.title}" data-song-artist="${song.artist}">
              <strong>${song.title}</strong> by ${song.artist}
            </button>
          `;
        });
        
        html += `</div>`;
        searchResults.innerHTML = html;
        
        // Add click handlers for results
        document.querySelectorAll('.song-result').forEach(btn => {
          btn.addEventListener('click', function() {
            const songTitle = this.getAttribute('data-song-title');
            const songArtist = this.getAttribute('data-song-artist');
            const targetInputId = document.getElementById('songSearchModal').getAttribute('data-target-input');
            
            document.getElementById(targetInputId).value = `${songTitle} - ${songArtist}`;
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('songSearchModal')).hide();
          });
        });
      } else {
        searchResults.innerHTML = `
          <div class="alert alert-info">
            <i class="fas fa-info-circle"></i> No songs found matching "${searchTerm}".
            <button class="btn btn-sm btn-primary float-end" id="add-new-song-btn">
              <i class="fas fa-plus"></i> Add New Song
            </button>
          </div>
        `;
        
        // Setup add new song button
        document.getElementById('add-new-song-btn').addEventListener('click', () => {
          showAddSongModal(searchTerm);
        });
      }
    } else {
      searchResults.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-triangle"></i> Error searching songs: ${result.error}
        </div>
      `;
    }
  }
}

// Show add song modal
function showAddSongModal(searchTerm = '') {
  // Create modal if it doesn't exist
  if (!document.getElementById('addSongModal')) {
    const modalHTML = `
      <div class="modal fade" id="addSongModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Add Song to Database</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form id="add-song-form">
                <div class="mb-3">
                  <label for="song-title" class="form-label">Song Title</label>
                  <input type="text" class="form-control" id="song-title" required>
                </div>
                <div class="mb-3">
                  <label for="song-artist" class="form-label">Artist</label>
                  <input type="text" class="form-control" id="song-artist" required>
                </div>
                <div class="mb-3">
                  <label for="song-genre" class="form-label">Genre</label>
                  <select class="form-select" id="song-genre">
                    <option value="">Select a genre (optional)</option>
                    <option value="Pop">Pop</option>
                    <option value="Rock">Rock</option>
                    <option value="Hip Hop">Hip Hop</option>
                    <option value="R&B">R&B</option>
                    <option value="Country">Country</option>
                    <option value="EDM">EDM</option>
                    <option value="Jazz">Jazz</option>
                    <option value="Classical">Classical</option>
                    <option value="Folk">Folk</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div id="add-song-error" class="alert alert-danger d-none"></div>
                <button type="submit" class="btn btn-primary w-100">
                  <i class="fas fa-save"></i> Save Song
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Setup form submission
    document.getElementById('add-song-form').addEventListener('submit', handleAddSong);
  }
  
  // Fill in search term if provided
  if (searchTerm) {
    // Guess if the search term is a title or artist
    if (searchTerm.includes(' - ')) {
      const [title, artist] = searchTerm.split(' - ');
      document.getElementById('song-title').value = title.trim();
      document.getElementById('song-artist').value = artist.trim();
    } else {
      document.getElementById('song-title').value = searchTerm;
      document.getElementById('song-artist').value = '';
    }
  } else {
    document.getElementById('song-title').value = '';
    document.getElementById('song-artist').value = '';
  }
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('addSongModal'));
  modal.show();
}

// Handle add song form submission
async function handleAddSong(event) {
  event.preventDefault();
  
  const title = document.getElementById('song-title').value.trim();
  const artist = document.getElementById('song-artist').value.trim();
  const genre = document.getElementById('song-genre').value;
  const errorElement = document.getElementById('add-song-error');
  
  if (!title || !artist) {
    errorElement.textContent = 'Please enter both title and artist.';
    errorElement.classList.remove('d-none');
    return;
  }
  
  // Show loading state
  const submitButton = event.target.querySelector('button[type="submit"]');
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
  submitButton.disabled = true;
  errorElement.classList.add('d-none');
  
  // Add song to database
  const songData = {
    title,
    artist,
    genre: genre || 'Uncategorized',
    addedAt: new Date().toISOString()
  };
  
  if (appState.currentUser) {
    const result = await addSongToDatabase(appState.currentUser.uid, songData);
    
    // Reset button
    submitButton.innerHTML = '<i class="fas fa-save"></i> Save Song';
    submitButton.disabled = false;
    
    if (result.success) {
      // Add to local state
      if (!appState.songDatabase) appState.songDatabase = [];
      appState.songDatabase.push(songData);
      
      // Close modal
      bootstrap.Modal.getInstance(document.getElementById('addSongModal')).hide();
      
      // Update search results if search modal is open
      if (document.getElementById('songSearchModal').classList.contains('show')) {
        performSongSearch();
      }
      
      // Show success toast
      showToast('Song Added', `"${title}" by ${artist} has been added to your song database.`);
    } else {
      // Show error
      errorElement.textContent = result.error;
      errorElement.classList.remove('d-none');
    }
  }
}

// Show toast notification
function showToast(title, message) {
  // Create toast container if it doesn't exist
  if (!document.getElementById('toast-container')) {
    const containerHTML = `
      <div id="toast-container" class="toast-container position-fixed bottom-0 end-0 p-3"></div>
    `;
    document.body.insertAdjacentHTML('beforeend', containerHTML);
  }
  
  const container = document.getElementById('toast-container');
  const toastId = 'toast-' + Date.now();
  
  const toastHTML = `
    <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <strong class="me-auto">${title}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', toastHTML);
  
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
  toast.show();
  
  // Remove toast from DOM after it's hidden
  toastElement.addEventListener('hidden.bs.toast', function() {
    toastElement.remove();
  });
}

// Update the Now Singing display
function updateNowSingingDisplay() {
  const nowSingingContainer = document.getElementById('now-singing-container');
  const nextSongContainer = document.getElementById('next-song-container');
  
  // Display current song if exists
  if (appState.currentSinging) {
    const bgClass = appState.timeIsUp ? 'bg-danger bg-gradient' : 'bg-purple-900 bg-gradient';
    
    nowSingingContainer.innerHTML = `
      <div class="card ${bgClass} text-white shadow">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h2 class="card-title">
                <i class="fas fa-music"></i> Now Singing
              </h2>
              <p class="card-text fs-5">
                ${getSpotDisplay(appState.currentSinging.spotId)} - ${appState.currentSinging.songName}
              </p>
              <div class="d-flex align-items-center gap-2 mt-2">
                <div class="bg-white bg-opacity-30 px-2 py-1 rounded">
                  ${formatTime(appState.timeElapsed)} / 3:00
                </div>
                <span class="badge bg-success">
                  <i class="fas fa-check-circle"></i> Song Counted
                </span>
              </div>
            </div>
            <button class="btn btn-light" onclick="markAsCompleted()">
              <i class="fas fa-check"></i> Mark Completed
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Display next song if exists and time is up
    if (appState.songQueue.length > 0 && appState.timeIsUp) {
      const nextSong = appState.songQueue[0];
      nextSongContainer.innerHTML = `
        <div class="card bg-light border-primary shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h3 class="card-title text-primary">
                  <i class="fas fa-arrow-circle-up"></i> Up Next
                </h3>
                <p class="card-text">
                  ${getSpotDisplay(nextSong.spotId)} - ${nextSong.songName}
                </p>
              </div>
              <button class="btn btn-primary" onclick="startNextSong()">
                <i class="fas fa-play-circle"></i> Start Next
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
        <div class="card bg-success bg-opacity-25 border-success shadow">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h3 class="card-title text-success">
                  <i class="fas fa-play-circle"></i> Next Song Ready
                </h3>
                <p class="card-text fs-5">
                  ${getSpotDisplay(nextSong.spotId)} - ${nextSong.songName}
                </p>
              </div>
              <button class="btn btn-success" onclick="startCurrentSong('${nextSong.spotId}', '${nextSong.songName}')">
                <i class="fas fa-play"></i> Start Now
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      nextSongContainer.innerHTML = `
        <div class="card bg-light border-secondary shadow-sm">
          <div class="card-body text-center text-muted">
            <i class="fas fa-music fa-2x mb-2"></i>
            <p class="mb-0">No songs in queue. Add songs to get started!</p>
          </div>
        </div>
      `;
    }
  }
}

// Update the song queue display
function updateQueueDisplay() {
  const songQueueTable = document.getElementById('song-queue-table');
  
  if (appState.songQueue.length === 0) {
    songQueueTable.innerHTML = `
      <div class="text-center text-muted py-4">
        <i class="fas fa-list fa-2x mb-2"></i>
        <p>No songs in queue</p>
      </div>
    `;
    return;
  }
  
  // Build the queue table
  let tableHTML = `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead class="table-light">
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
              <button class="btn btn-sm btn-outline-primary" onclick="moveSongUp(${index})">
                <i class="fas fa-arrow-up"></i>
              </button>
            ` : ''}
            ${index < appState.songQueue.length - 1 ? `
              <button class="btn btn-sm btn-outline-primary" onclick="moveSongDown(${index})">
                <i class="fas fa-arrow-down"></i>
              </button>
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
            <button class="btn btn-sm btn-success" onclick="startCurrentSong('${item.spotId}', '${item.songName}')" title="Start Now">
              <i class="fas fa-play"></i>
            </button>
            ${index > 0 ? `
              <button class="btn btn-sm btn-danger" onclick="boostSongToTop('${item.spotId}', '${item.songName}')" title="Boost to Top ($$)">
                <i class="fas fa-bolt"></i>
              </button>
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
  saveToFirebase({ 
    songQueue: appState.songQueue, 
    history: appState.history, 
    currentSinging: appState.currentSinging,
    spots: appState.spots,
    timeElapsed: appState.timeElapsed,
    timeIsUp: appState.timeIsUp
  });
  
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
  saveToFirebase({ 
    history: appState.history, 
    currentSinging: null,
    timeElapsed: 0,
    timeIsUp: false
  });
  
  updateNowSingingDisplay();
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
      saveToFirebase({ timeElapsed: appState.timeElapsed, timeIsUp: true });
    }
    
    // Update the timer display every 5 seconds to save resources
    if (appState.timeElapsed % 5 === 0) {
      const timerDisplay = document.querySelector('#now-singing-container .bg-white');
      if (timerDisplay) {
        timerDisplay.textContent = `${formatTime(appState.timeElapsed)} / 3:00`;
      }
      
      // Save time elapsed every 15 seconds
      if (appState.timeElapsed % 15 === 0) {
        saveToFirebase({ timeElapsed: appState.timeElapsed });
      }
    }
  }, 1000);
}

// Update song name in queue
function updateSongName(index, newName) {
  if (index >= 0 && index < appState.songQueue.length) {
    appState.songQueue[index].songName = newName.trim();
    saveToFirebase({ songQueue: appState.songQueue });
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
  saveToFirebase({ songQueue: appState.songQueue });
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
  saveToFirebase({ songQueue: appState.songQueue });
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
  saveToFirebase({ 
    songQueue: appState.songQueue,
    history: appState.history
  });
  
  updateQueueDisplay();
  showToast('Song Boosted', `"${songName}" has been boosted to the top of the queue.`);
}

// Build the Tables Tab UI
function buildTablesTab() {
  const tablesTab = document.getElementById('tables-tab');
  
  tablesTab.innerHTML = `
    <div class="card shadow">
      <div class="card-body">
        <h2 class="card-title">Seats & Billing</h2>
        
        <div class="alert alert-warning">
          <i class="fas fa-info-circle"></i> <strong>Note:</strong> Each song performed costs $2. Add these charges manually to the customer's bill.
        </div>
        
        <ul class="nav nav-tabs" id="seatTabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="tables-tab-btn" data-bs-toggle="tab" data-bs-target="#tables-content" type="button" role="tab">
              <i class="fas fa-chair"></i> Tables
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="bar-tab-btn" data-bs-toggle="tab" data-bs-target="#bar-content" type="button" role="tab">
              <i class="fas fa-glass-martini-alt"></i> Bar Seats
            </button>
          </li>
        </ul>
        
        <div class="tab-content p-3" id="seatTabsContent">
          <div class="tab
          <div class="tab-content p-3" id="seatTabsContent">
            <div class="tab-pane fade show active" id="tables-content" role="tabpanel">
              <div class="table-responsive">
                <table class="table table-bordered table-hover">
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
                              onclick="markSpotAsPaid('${spot.id}')">
                              <i class="fas fa-check-circle"></i> Paid
                            </button>
                          </td>
                        </tr>
                      `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="tab-pane fade" id="bar-content" role="tabpanel">
              <div class="table-responsive">
                <table class="table table-bordered table-hover">
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
                              onclick="markSpotAsPaid('${spot.id}')">
                              <i class="fas fa-check-circle"></i> Paid
                            </button>
                          </td>
                        </tr>
                      `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div class="card mt-4 bg-light">
            <div class="card-body">
              <h3>Daily Summary</h3>
              <div class="row">
                <div class="col-md-4">
                  <div class="card bg-success text-white mb-3">
                    <div class="card-body text-center">
                      <h5 class="card-title">Total Revenue</h5>
                      <p class="display-4">$${calculateTotalRevenue().toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="card bg-primary text-white mb-3">
                    <div class="card-body text-center">
                      <h5 class="card-title">Songs Performed</h5>
                      <p class="display-4">${calculateTotalSongs()}</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="card bg-warning text-dark mb-3">
                    <div class="card-body text-center">
                      <h5 class="card-title">Active Customers</h5>
                      <p class="display-4">${countActiveCustomers()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Update spot occupant name
function updateSpotOccupant(spotId, newName) {
  if (appState.spots[spotId]) {
    appState.spots[spotId].occupant = newName.trim();
    saveToFirebase({ spots: appState.spots });
    
    // Update queue tab if visible
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
      saveToFirebase({ spots: appState.spots });
      buildTablesTab();
    }
  }
}

// Mark a spot as paid (reset occupant and count)
function markSpotAsPaid(spotId) {
  if (appState.spots[spotId]) {
    appState.spots[spotId].occupant = '';
    appState.spots[spotId].performedCount = 0;
    saveToFirebase({ spots: appState.spots });
    buildTablesTab();
    
    // Update queue tab if visible
    if (document.getElementById('queue-tab').style.display !== 'none') {
      buildQueueTab();
    }
    
    showToast('Table Cleared', `${appState.spots[spotId].name} has been marked as paid and cleared.`);
  }
}

// Calculate total revenue
function calculateTotalRevenue() {
  return Object.values(appState.spots).reduce((total, spot) => {
    return total + (spot.performedCount || 0) * 2;
  }, 0);
}

// Calculate total songs performed
function calculateTotalSongs() {
  return Object.values(appState.spots).reduce((total, spot) => {
    return total + (spot.performedCount || 0);
  }, 0);
}

// Count active customers (spots with occupants)
function countActiveCustomers() {
  return Object.values(appState.spots).filter(spot => spot.occupant).length;
}

// Build the History Tab UI
function buildHistoryTab() {
  const historyTab = document.getElementById('history-tab');
  
  // Calculate summary statistics
  const regularSongs = appState.history.filter(item => item.status !== 'boosted').length;
  const boostedSongs = appState.history.filter(item => item.status === 'boosted').length;
  const totalRevenue = regularSongs * 2;
  
  historyTab.innerHTML = `
    <div class="card shadow">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2 class="card-title">
            <i class="fas fa-history"></i> Song History
          </h2>
          <div class="btn-group">
            <button class="btn btn-outline-primary" onclick="exportHistory()">
              <i class="fas fa-download"></i> Export CSV
            </button>
            <button class="btn btn-danger" onclick="clearHistory()">
              <i class="fas fa-trash-alt"></i> Clear History
            </button>
          </div>
        </div>
        
        ${appState.history.length === 0 ? 
          `<div class="text-center text-muted py-5">
            <i class="fas fa-history fa-3x mb-3"></i>
            <p class="lead">No song history yet</p>
            <p>Song performances will be recorded here</p>
          </div>` :
          `
          <div class="table-responsive">
            <table class="table table-hover">
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
                  <tr class="${item.status === 'boosted' ? 'table-danger bg-opacity-25' : ''}">
                    <td>${item.orderedTime || '-'}</td>
                    <td>${item.startTime || '-'}</td>
                    <td>${item.spotName || '-'}</td>
                    <td>${item.occupant || '-'}</td>
                    <td>
                      ${item.songName || '-'} 
                      ${item.status === 'boosted' ? '<span class="badge bg-danger"><i class="fas fa-bolt"></i> Boosted</span>' : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="card mt-4 bg-info bg-opacity-10 border-info">
            <div class="card-body">
              <h3 class="card-title text-info">
                <i class="fas fa-chart-bar"></i> Daily Summary
              </h3>
              <div class="row">
                <div class="col-md-4">
                  <div class="card bg-light mb-3">
                    <div class="card-body text-center">
                      <h5 class="card-title">Regular Songs</h5>
                      <p class="display-6">${regularSongs}</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="card bg-light mb-3">
                    <div class="card-body text-center">
                      <h5 class="card-title">Boosted Songs</h5>
                      <p class="display-6">${boostedSongs}</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="card bg-light mb-3">
                    <div class="card-body text-center">
                      <h5 class="card-title">Total Revenue</h5>
                      <p class="display-6">$${totalRevenue.toFixed(2)}</p>
                      <small class="text-muted">(Excluding boost fees)</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          `
        }
      </div>
    </div>
  `;
}

// Export history to CSV
function exportHistory() {
  if (appState.history.length === 0) {
    alert('No history to export');
    return;
  }
  
  // Create CSV content
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Add header row
  csvContent += "Ordered Time,Played Time,Seat,Occupant,Song,Status\n";
  
  // Add data rows
  appState.history.forEach(item => {
    const row = [
      item.orderedTime || '',
      item.startTime || '',
      item.spotName || '',
      item.occupant || '',
      `"${item.songName.replace(/"/g, '""')}"`,
      item.status
    ];
    csvContent += row.join(',') + '\n';
  });
  
  // Create download link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `sipsing-history-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  
  // Trigger download
  link.click();
  
  // Clean up
  document.body.removeChild(link);
}

// Clear history
function clearHistory() {
  if (confirm('Are you sure you want to clear the entire history? This cannot be undone.')) {
    appState.history = [];
    saveToFirebase({ history: appState.history });
    buildHistoryTab();
    showToast('History Cleared', 'All song history has been deleted.');
  }
}

// Build the Songs Tab UI
function buildSongsTab() {
  const songsTab = document.getElementById('songs-tab');
  
  songsTab.innerHTML = `
    <div class="card shadow">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2 class="card-title">
            <i class="fas fa-music"></i> Song Database
          </h2>
          <button class="btn btn-primary" onclick="showAddSongModal()">
            <i class="fas fa-plus"></i> Add New Song
          </button>
        </div>
        
        <div class="row mb-4">
          <div class="col">
            <div class="input-group">
              <input type="text" id="song-db-search" class="form-control" placeholder="Search songs...">
              <button class="btn btn-outline-secondary" type="button" id="song-db-search-btn">
                <i class="fas fa-search"></i> Search
              </button>
            </div>
          </div>
        </div>
        
        <div id="song-database-results">
          ${renderSongDatabase()}
        </div>
      </div>
    </div>
  `;
  
  // Set up search functionality
  document.getElementById('song-db-search-btn').addEventListener('click', searchSongDatabaseUI);
  document.getElementById('song-db-search').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      searchSongDatabaseUI();
    }
  });
}

// Render the song database
function renderSongDatabase() {
  if (!appState.songDatabase || appState.songDatabase.length === 0) {
    return `
      <div class="text-center text-muted py-5">
        <i class="fas fa-music fa-3x mb-3"></i>
        <p class="lead">Your song database is empty</p>
        <p>Add songs to keep track of your available music</p>
      </div>
    `;
  }
  
  // Sort songs by title
  const sortedSongs = [...appState.songDatabase].sort((a, b) => 
    a.title.localeCompare(b.title)
  );
  
  return `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead class="table-light">
          <tr>
            <th>Title</th>
            <th>Artist</th>
            <th>Genre</th>
            <th class="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${sortedSongs.map(song => `
            <tr>
              <td>${song.title}</td>
              <td>${song.artist}</td>
              <td>${song.genre || 'Uncategorized'}</td>
              <td class="text-center">
                <button class="btn btn-sm btn-primary" onclick="addSongToQueueFromDB('${song.title}', '${song.artist}')">
                  <i class="fas fa-plus"></i> Add to Queue
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Search song database and update UI
function searchSongDatabaseUI() {
  const searchInput = document.getElementById('song-db-search');
  const searchTerm = searchInput.value.trim();
  const resultsContainer = document.getElementById('song-database-results');
  
  if (!searchTerm) {
    resultsContainer.innerHTML = renderSongDatabase();
    return;
  }
  
  if (!appState.songDatabase || appState.songDatabase.length === 0) {
    resultsContainer.innerHTML = `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i> Your song database is empty. Add some songs first.
      </div>
    `;
    return;
  }
  
  // Filter songs
  const searchTermLower = searchTerm.toLowerCase();
  const filteredSongs = appState.songDatabase.filter(song => 
    song.title.toLowerCase().includes(searchTermLower) || 
    song.artist.toLowerCase().includes(searchTermLower) ||
    (song.genre && song.genre.toLowerCase().includes(searchTermLower))
  );
  
  if (filteredSongs.length > 0) {
    resultsContainer.innerHTML = `
      <div class="alert alert-success mb-3">
        <i class="fas fa-search"></i> Found ${filteredSongs.length} song(s) matching "${searchTerm}"
      </div>
      
      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>Title</th>
              <th>Artist</th>
              <th>Genre</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSongs.map(song => `
              <tr>
                <td>${song.title}</td>
                <td>${song.artist}</td>
                <td>${song.genre || 'Uncategorized'}</td>
                <td class="text-center">
                  <button class="btn btn-sm btn-primary" onclick="addSongToQueueFromDB('${song.title}', '${song.artist}')">
                    <i class="fas fa-plus"></i> Add to Queue
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    resultsContainer.innerHTML = `
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i> No songs found matching "${searchTerm}".
        <button class="btn btn-sm btn-primary float-end" onclick="showAddSongModal('${searchTerm}')">
          <i class="fas fa-plus"></i> Add New Song
        </button>
      </div>
    `;
  }
}

// Add song from database to queue
function addSongToQueueFromDB(title, artist) {
  // Show modal to select spot
  if (!document.getElementById('addToQueueModal')) {
    const modalHTML = `
      <div class="modal fade" id="addToQueueModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Add Song to Queue</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p class="lead" id="add-queue-song-name"></p>
              <div class="mb-3">
                <label for="add-queue-spot" class="form-label">Select a Seat</label>
                <select id="add-queue-spot" class="form-select">
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
              <div id="add-queue-error" class="alert alert-danger d-none"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="confirm-add-to-queue">
                <i class="fas fa-plus"></i> Add to Queue
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
  
  // Update song info
  document.getElementById('add-queue-song-name').textContent = `"${title}" by ${artist}`;
  document.getElementById('add-queue-error').classList.add('d-none');
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('addToQueueModal'));
  modal.show();
  
  // Set up confirm button
  const confirmBtn = document.getElementById('confirm-add-to-queue');
  
  // Remove any existing event listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  // Add new event listener
  newConfirmBtn.addEventListener('click', function() {
    const spotId = document.getElementById('add-queue-spot').value;
    const errorElement = document.getElementById('add-queue-error');
    
    if (!spotId) {
      errorElement.textContent = 'Please select a seat';
      errorElement.classList.remove('d-none');
      return;
    }
    
    // Add to queue
    const songName = `${title} - ${artist}`;
    const currentTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    appState.songQueue.push({
      spotId,
      songName,
      time: currentTime
    });
    
    // Save and update
    saveToFirebase({ songQueue: appState.songQueue });
    
    // Close modal
    modal.hide();
    
    // Show toast
    showToast('Song Added', `"${songName}" has been added to the queue.`);
    
    // Go to queue tab
    document.querySelector(`.nav-link[data-tab="queue"]`).click();
  });
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
window.exportHistory = exportHistory;
window.showAddSongModal = showAddSongModal;
window.addSongToQueueFromDB = addSongToQueueFromDB;
window.searchSongDatabaseUI = searchSongDatabaseUI;

// There are many more functions to implement, but this should give you a good start. Would you like me to continue with the remaining functions?
