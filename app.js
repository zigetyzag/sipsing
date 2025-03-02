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

// There are many more functions to implement, but this should give you a good start. Would you like me to continue with the remaining functions?
