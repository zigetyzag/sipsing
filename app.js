// Import Firebase functions
import {
  checkAuthState,
  signIn,
  signUp,
  signInWithGoogle,
  signInWithApple,
  logOut,
  saveVenueData,
  getVenueData,
  addSongToDatabase
} from './firebase.js';

// Application state
let appState = {
  currentUser: null,
  isAnonymous: false,
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
  // Add error handler for Firebase initialization issues
  try {
    // Check authentication state
    checkAuthState((user) => {
      if (user) {
        // User is logged in
        appState.currentUser = user;
        appState.isAnonymous = false;
        loadVenueData(user.uid);
      } else {
        // User is not logged in, show login screen
        showLoginScreen();
      }
    });
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // Still show the login screen with an error message
    showLoginScreen(true);
  }
});

// Show login screen with option to use without logging in
function showLoginScreen(hasFirebaseError = false) {
  const appElement = document.getElementById('app');
  
  appElement.innerHTML = `
    <div class="row justify-content-center mt-5">
      <div class="col-md-6">
        <div class="card shadow">
          <div class="card-header bg-primary text-white">
            <h2 class="text-center mb-0">Sipsing DJ Manager</h2>
          </div>
          <div class="card-body">
            ${hasFirebaseError ? `
            <div class="alert alert-warning mb-3">
              <i class="fas fa-exclamation-triangle"></i> <strong>Firebase Connection Error:</strong> 
              There are issues connecting to the Firebase backend. You can continue without logging in.
            </div>` : ''}
            
            <ul class="nav nav-tabs" id="authTabs" role="tablist" ${hasFirebaseError ? 'style="display:none"' : ''}>
              <li class="nav-item" role="presentation">
                <button class="nav-link active" id="login-tab" data-bs-toggle="tab" data-bs-target="#login" type="button" role="tab" aria-controls="login" aria-selected="true">Login</button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="register-tab" data-bs-toggle="tab" data-bs-target="#register" type="button" role="tab" aria-controls="register" aria-selected="false">Register</button>
              </li>
            </ul>
            <div class="tab-content p-3" id="authTabsContent" ${hasFirebaseError ? 'style="display:none"' : ''}>
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
                  <button type="submit" class="btn btn-primary w-100 mb-3">Login</button>
                  
                  <div class="d-flex justify-content-center">
                    <button type="button" id="google-signin" class="btn btn-outline-danger me-2">
                      <i class="fab fa-google"></i> Sign in with Google
                    </button>
                    <button type="button" id="apple-signin" class="btn btn-outline-dark">
                      <i class="fab fa-apple"></i> Sign in with Apple
                    </button>
                  </div>
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
                    <label for="register-confirm-password" class="form-label">Confirm Password</label>
                    <input type="password" class="form-control" id="register-confirm-password" required>
                  </div>
                  <div id="register-error" class="alert alert-danger d-none"></div>
                  <button type="submit" class="btn btn-primary w-100">Register</button>
                </form>
              </div>
            </div>
            
            <div class="text-center mt-4">
              ${!hasFirebaseError ? `<p>- OR -</p>` : ''}
              <button id="use-without-login" class="btn btn-lg ${hasFirebaseError ? 'btn-primary' : 'btn-success'}" style="${hasFirebaseError ? 'font-size: 1.2em; padding: 15px 30px;' : ''}">
                <i class="fas fa-play-circle"></i> Use Without Login
              </button>
              <p class="mt-2 text-muted small">Note: Your data will only be stored on this device</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners for forms
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
  document.getElementById('use-without-login').addEventListener('click', useWithoutLogin);
  document.getElementById('google-signin').addEventListener('click', signInWithGoogleHandler);
  document.getElementById('apple-signin').addEventListener('click', signInWithAppleHandler);
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
    appState.isAnonymous = false;
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
  const confirmPassword = document.getElementById('register-confirm-password').value;
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
  
  if (password !== confirmPassword) {
    errorElement.textContent = 'Passwords do not match.';
    errorElement.classList.remove('d-none');
    submitButton.innerHTML = 'Register';
    submitButton.disabled = false;
    return;
  }
  
  // Attempt to sign up
  const result = await signUp(email, password, "My Karaoke Venue");
  
  // Reset button
  submitButton.innerHTML = 'Register';
  submitButton.disabled = false;
  
  if (result.success) {
    // Registration successful
    appState.currentUser = result.user;
    appState.isAnonymous = false;
    appState.venueName = "My Karaoke Venue";
    
    // Initialize default data
    initializeDefaultData();
    
    // Initialize the app UI
    initializeAppUI();
  } else {
    // Registration failed, show error
    errorElement.textContent = result.error;
    errorElement.classList.remove('d-none');
  }
}

// Sign in with Google handler
async function signInWithGoogleHandler() {
  try {
    const result = await signInWithGoogle();
    
    if (result.success) {
      // Login successful
      appState.currentUser = result.user;
      appState.isAnonymous = false;
      loadVenueData(result.user.uid);
    } else {
      // Show error
      const errorElement = document.getElementById('login-error');
      errorElement.textContent = result.error;
      errorElement.classList.remove('d-none');
    }
  } catch (error) {
    console.error("Google sign-in error:", error);
    const errorElement = document.getElementById('login-error');
    errorElement.textContent = "Error signing in with Google. Please try again.";
    errorElement.classList.remove('d-none');
  }
}

// Sign in with Apple handler
async function signInWithAppleHandler() {
  try {
    const result = await signInWithApple();
    
    if (result.success) {
      // Login successful
      appState.currentUser = result.user;
      appState.isAnonymous = false;
      loadVenueData(result.user.uid);
    } else {
      // Show error
      const errorElement = document.getElementById('login-error');
      errorElement.textContent = result.error;
      errorElement.classList.remove('d-none');
    }
  } catch (error) {
    console.error("Apple sign-in error:", error);
    const errorElement = document.getElementById('login-error');
    errorElement.textContent = "Error signing in with Apple. Please try again.";
    errorElement.classList.remove('d-none');
  }
}

// Function to use app without login
function useWithoutLogin() {
  console.log("Starting in offline mode...");
  
  // Set app state for anonymous use (without Firebase)
  appState.currentUser = null;
  appState.isAnonymous = true;
  appState.venueName = 'My Karaoke Venue';
  
  // Initialize local data
  initializeDefaultData();
  
  // Try to load from localStorage
  const savedData = localStorage.getItem('sipsingDJManager');
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      console.log("Loaded saved data from localStorage");
      appState.spots = parsed.spots || appState.spots;
      appState.songQueue = parsed.songQueue || [];
      appState.history = parsed.history || [];
      appState.currentSinging = parsed.currentSinging;
      appState.timeElapsed = parsed.timeElapsed || 0;
      appState.timeIsUp = parsed.timeIsUp || false;
      appState.songDatabase = parsed.songDatabase || [];
    } catch (e) {
      console.error("Error parsing saved data:", e);
    }
  } else {
    console.log("No saved data found, creating default data");
  }
  
  // Save initial data to localStorage
  saveLocalData();
  
  try {
    // Initialize the app UI
    initializeAppUI();
    
    // Start timer if there's a current song
    if (appState.currentSinging) {
      startSongTimer();
    }
    
    console.log("Application initialized in offline mode successfully");
  } catch (error) {
    console.error("Error initializing UI:", error);
    alert("There was an error initializing the application. Please refresh the page and try again.");
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

// Function to save data locally when in anonymous mode
function saveLocalData() {
  localStorage.setItem('sipsingDJManager', JSON.stringify({
    spots: appState.spots,
    songQueue: appState.songQueue,
    history: appState.history,
    currentSinging: appState.currentSinging,
    timeElapsed: appState.timeElapsed,
    timeIsUp: appState.timeIsUp,
    songDatabase: appState.songDatabase,
    lastUpdated: new Date().toISOString()
  }));
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
          </ul>
          <ul class="navbar-nav ms-auto">
            ${appState.isAnonymous ? 
              `<li class="nav-item">
                <a class="nav-link" href="#" id="login-button">
                  <i class="fas fa-sign-in-alt"></i> Login
                </a>
              </li>` :
              `<li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown">
                  <i class="fas fa-user"></i> ${appState.currentUser ? appState.currentUser.email : 'User'}
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><a class="dropdown-item" href="#" id="logout-button">Logout</a></li>
                </ul>
              </li>`
            }
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
    });
  });
  
  // Set up login button for anonymous mode
  if (appState.isAnonymous) {
    document.getElementById('login-button').addEventListener('click', function() {
      showLoginScreen();
    });
  } else {
    // Set up logout button
    document.getElementById('logout-button').addEventListener('click', async function() {
      try {
        const result = await logOut();
        if (result.success) {
          // Clear app state
          appState = {
            currentUser: null,
            isAnonymous: false,
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
// Show login screen after logout
          showLoginScreen();
        } else {
          alert("Error logging out: " + result.error);
        }
      } catch (error) {
        console.error("Error during logout:", error);
        alert("Error logging out. Please try again.");
      }
    });
  }
  
  // Build initial tab content
  buildQueueTab();
}

// Save data to Firebase or localStorage
async function saveToFirebase(updates = {}) {
  // If anonymous mode, save to localStorage instead
  if (appState.isAnonymous) {
    saveLocalData();
    return { success: true };
  }
  
  // Also save to localStorage as a backup
  saveLocalData();
  
  // If not logged in, don't save to Firebase
  if (!appState.currentUser) return { success: false, error: "Not logged in" };
  
  // Create data object with updates
  const data = { ...updates };
  
  // Add timestamp
  data.lastUpdated = new Date().toISOString();
  
  // Save to Firebase
  try {
    await saveVenueData(appState.currentUser.uid, data);
    return { success: true };
  } catch (error) {
    console.error("Error saving to Firebase:", error);
    return { success: false, error: error.message };
  }
}

// Build the Queue Tab UI
function buildQueueTab() {
  const queueTab = document.getElementById('queue-tab');
  
  queueTab.innerHTML = `
    <div class="row">
      <!-- Add Songs Section - Full Width, First Position -->
      <div class="col-md-12 mb-3">
        <div class="card shadow-sm">
          <div class="card-header bg-primary text-white">
            <h2 class="card-title mb-0"><i class="fas fa-plus-circle"></i> Add Songs to Queue</h2>
          </div>
          <div class="card-body">
            <div id="add-song-form">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="spot-select" class="form-label fw-bold">Select a Seat</label>
                  <select id="spot-select" class="form-select form-select-lg">
                    <option value="">-- Choose Seat --</option>
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
                <div id="song-inputs" class="col-md-6" style="display:none;">
                  <div class="mb-3">
                    <label for="song1" class="form-label fw-bold">Song 1</label>
                    <input type="text" id="song1" class="form-control form-control-lg" placeholder="Enter Song Name">
                  </div>
                  <div class="mb-3">
                    <label for="song2" class="form-label fw-bold">Song 2 (Optional)</label>
                    <input type="text" id="song2" class="form-control form-control-lg" placeholder="Enter Song Name">
                  </div>
                  <button id="add-songs-btn" class="btn btn-primary btn-lg w-100">
                    <i class="fas fa-plus-circle"></i> Add Song(s) to Queue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Now Singing Section - Second Position -->
      <div class="col-md-12 mb-3">
        <div class="row">
          <!-- Current song container -->
          <div class="col-lg-7 mb-3 mb-lg-0">
            <div id="now-singing-container">
              <!-- Current song will be displayed here -->
            </div>
          </div>
          
          <!-- Next song container -->
          <div class="col-lg-5">
            <div id="next-song-container">
              <!-- Next song info will be displayed here -->
            </div>
          </div>
        </div>
      </div>
      
      <!-- Song Queue Section - Third Position -->
      <div class="col-md-12">
        <div class="card shadow-sm">
          <div class="card-header bg-secondary text-white">
            <h2 class="card-title mb-0"><i class="fas fa-list"></i> Song Queue</h2>
          </div>
          <div class="card-body">
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
    let songsAdded = 0;
    
    // Add songs to queue
    if (song1) {
      appState.songQueue.push({
        spotId,
        songName: song1,
        time: currentTime
      });
      songsAdded++;
    }
    
    if (song2) {
      appState.songQueue.push({
        spotId,
        songName: song2,
        time: currentTime
      });
      songsAdded++;
    }
    
    console.log(`Added ${songsAdded} songs to queue`);
    
    // Reset form
    spotSelect.value = '';
    song1Input.value = '';
    song2Input.value = '';
    songInputs.style.display = 'none';
    
    // Save data and update displays
    saveToFirebase({ songQueue: appState.songQueue });
    updateQueueDisplay();
    
    // Update the "Now Singing" display to refresh the "on deck" preview
    // This is especially important when adding to an empty queue
    if (appState.songQueue.length === songsAdded) {
      updateNowSingingDisplay();
    }
    
    // Show confirmation toast
    showToast('Songs Added', `${songsAdded} song${songsAdded > 1 ? 's' : ''} added to the queue.`);
  });
}

// Update the Now Singing display
function updateNowSingingDisplay() {
  const nowSingingContainer = document.getElementById('now-singing-container');
  const nextSongContainer = document.getElementById('next-song-container');
  
  // Display current song if exists
  if (appState.currentSinging) {
    const bgClass = appState.timeIsUp ? 'bg-danger' : 'bg-primary';
    
    nowSingingContainer.innerHTML = `
      <div class="card ${bgClass} shadow">
        <div class="card-header text-white">
          <h2 class="card-title mb-0">
            <i class="fas fa-music"></i> Now Singing
          </h2>
        </div>
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-8">
              <h3 class="text-dark mb-3">
                ${appState.currentSinging.songName}
              </h3>
              <p class="text-dark fs-5 mb-3">
                <strong>From:</strong> ${getSpotDisplay(appState.currentSinging.spotId)}
              </p>
              <div class="d-flex align-items-center gap-3 mb-2">
                <div class="px-3 py-2 rounded bg-dark text-white fw-bold fs-5">
                  <i class="fas fa-clock"></i> ${formatTime(appState.timeElapsed)} / 3:00
                </div>
                <span class="badge bg-success fs-6 px-3 py-2">
                  <i class="fas fa-check-circle"></i> Song Counted
                </span>
                ${appState.timeIsUp ? 
                  `<span class="badge bg-danger fs-6 px-3 py-2">
                    <i class="fas fa-exclamation-circle"></i> Time's Up!
                  </span>` 
                : ''}
              </div>
            </div>
            <div class="col-md-4 text-end">
              <button class="btn btn-light btn-lg border shadow-sm" onclick="markAsCompleted()">
                <i class="fas fa-check"></i> Mark Completed
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // When a song is playing, show the "On Deck" card in the nextSongContainer
    if (appState.songQueue.length > 0) {
      const nextSong = appState.songQueue[0];
      
      // Show "On Deck" card with consistent header regardless of timer status
      nextSongContainer.innerHTML = `
        <div class="card border-info shadow h-100">
          <div class="card-header bg-info text-white">
            <h3 class="card-title mb-0">
              <i class="fas fa-headphones"></i> On Deck
            </h3>
          </div>
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-md-7">
                <h4 class="text-dark mb-2">${nextSong.songName}</h4>
                <p class="text-dark fs-5 mb-2">
                  <strong>From:</strong> ${getSpotDisplay(nextSong.spotId)}
                </p>
                <span class="badge ${appState.timeIsUp ? 'bg-danger' : 'bg-secondary'} px-2 py-1 fs-6">
                  <i class="${appState.timeIsUp ? 'fas fa-arrow-circle-right' : 'fas fa-clock'}"></i>
                  ${appState.timeIsUp ? 'Ready to Start' : 'Coming up next'}
                </span>
              </div>
              <div class="col-md-5 text-end">
                <button class="btn ${appState.timeIsUp ? 'btn-danger' : 'btn-primary'} btn-lg w-100" 
                  onclick="${appState.timeIsUp ? 'startNextSong()' : 'startNextAndFinishCurrent()'}">
                  <i class="fas fa-play-circle"></i> 
                  ${appState.timeIsUp ? 'Start Next' : 'Start & Finish Current'}
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // No next song
      nextSongContainer.innerHTML = '';
    }
  } else {
    // No current song playing - show "Now Singing" area as "Waiting to Start"
    nowSingingContainer.innerHTML = `
      <div class="card bg-light shadow h-100">
        <div class="card-header bg-secondary text-white">
          <h2 class="card-title mb-0">
            <i class="fas fa-music"></i> Waiting to Start
          </h2>
        </div>
        <div class="card-body py-4">
          <div class="text-center">
            <i class="fas fa-pause-circle fa-3x text-secondary mb-3"></i>
            <p class="text-dark fs-5 mb-0">No song currently playing</p>
          </div>
        </div>
      </div>
    `;
    
    // Show the next song if available
    if (appState.songQueue.length > 0) {
      const nextSong = appState.songQueue[0];
      nextSongContainer.innerHTML = `
        <div class="card border-success shadow h-100">
          <div class="card-header bg-success text-white">
            <h3 class="card-title mb-0">
              <i class="fas fa-play-circle"></i> Ready to Start
            </h3>
          </div>
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-md-7">
                <h4 class="text-dark mb-2 fs-3">${nextSong.songName}</h4>
                <p class="text-dark fs-5 mb-3">
                  <strong>From:</strong> ${getSpotDisplay(nextSong.spotId)}
                </p>
                <span class="badge bg-success px-3 py-2 fs-6">
                  <i class="fas fa-check-circle"></i> Ready to Perform
                </span>
              </div>
              <div class="col-md-5 text-center">
                <button class="btn btn-success btn-lg w-100 px-4 py-3" onclick="startCurrentSong('${nextSong.spotId}', '${nextSong.songName}')">
                  <i class="fas fa-play-circle"></i> Start Now
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // No songs in queue
      nextSongContainer.innerHTML = `
        <div class="card border-secondary shadow-sm h-100">
          <div class="card-header bg-light">
            <h3 class="card-title text-secondary mb-0">
              <i class="fas fa-info-circle"></i> Queue Empty
            </h3>
          </div>
          <div class="card-body text-center py-5">
            <i class="fas fa-music fa-4x text-secondary mb-4"></i>
            <p class="fs-5 text-dark mb-0">Add songs using the form above to get started</p>
          </div>
        </div>
      `;
    }
  }
}

// Update the song queue display
function updateQueueDisplay() {
  const songQueueTable = document.getElementById('song-queue-table');
  
  if (!appState.songQueue || appState.songQueue.length === 0) {
    songQueueTable.innerHTML = `
      <div class="text-center py-4">
        <i class="fas fa-list fa-3x text-secondary mb-3"></i>
        <p class="fs-5 text-dark">No songs in queue</p>
        <p class="text-secondary">Songs will appear here after adding them using the form above</p>
      </div>
    `;
    return;
  }
  
  // Build the queue table
  let tableHTML = `
    <div class="table-responsive">
      <table class="table table-hover border">
        <thead class="table-dark">
          <tr>
            <th class="text-center" style="width: 80px;">Order</th>
            <th>Song</th>
            <th style="width: 200px;">Seat</th>
            <th class="text-center" style="width: 120px;">Actions</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  appState.songQueue.forEach((item, index) => {
    // Alternate row colors for better readability
    const rowClass = index % 2 === 0 ? 'table-light' : '';
    
    tableHTML += `
      <tr class="${rowClass}">
        <td class="text-center align-middle">
          <span class="badge bg-secondary rounded-circle p-2 fs-6">${index + 1}</span>
          <div class="d-flex justify-content-center gap-1 mt-2">
            ${index > 0 ? `
              <button class="btn btn-sm btn-outline-dark" onclick="moveSongUp(${index})" title="Move Up">
                <i class="fas fa-arrow-up"></i>
              </button>
            ` : ''}
            ${index < appState.songQueue.length - 1 ? `
              <button class="btn btn-sm btn-outline-dark" onclick="moveSongDown(${index})" title="Move Down">
                <i class="fas fa-arrow-down"></i>
              </button>
            ` : ''}
          </div>
        </td>
        <td class="align-middle">
          <input type="text" class="form-control form-control-lg border-secondary text-dark" value="${item.songName}" 
                 onchange="updateSongName(${index}, this.value)">
        </td>
        <td class="text-dark small align-middle fw-bold">${getSpotDisplay(item.spotId)}</td>
        <td class="text-center align-middle">
          <div class="d-flex flex-column gap-2">
            <button class="btn btn-success" onclick="startCurrentSong('${item.spotId}', '${item.songName}')" title="Start Now">
              <i class="fas fa-play"></i> Start
            </button>
            ${index > 0 ? `
              <button class="btn btn-danger" onclick="boostSongToTop('${item.spotId}', '${item.songName}')" title="Boost to Top ($$)">
                <i class="fas fa-bolt"></i> Boost
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
  if (!appState.spots || !appState.spots[spotId]) return spotId;
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
  console.log("Starting song:", songName, "from spot:", spotId);
  
  // Clear any existing timer
  if (appState.timer) {
    clearInterval(appState.timer);
    appState.timer = null;
    console.log("Cleared existing timer");
  }
  
  // If something is currently playing, mark it as complete
  if (appState.currentSinging) {
    markAsCompleted();
    console.log("Marked previous song as completed");
  }
  
  // Find and remove song from queue
  const index = appState.songQueue.findIndex(item => 
    item.spotId === spotId && item.songName === songName
  );
  
  if (index === -1) {
    console.error("Song not found in queue");
    return;
  }
  
  const queueItem = appState.songQueue[index];
  appState.songQueue.splice(index, 1);
  console.log("Removed song from queue at index:", index);
  
  // Add to billing count
  if (appState.spots[spotId]) {
    appState.spots[spotId].performedCount = (appState.spots[spotId].performedCount || 0) + 1;
    console.log("Updated spot performed count to:", appState.spots[spotId].performedCount);
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
  if (!appState.history) appState.history = [];
  appState.history.unshift(historyItem);
  
  appState.currentSinging = {
    id: performanceId,
    spotId,
    songName,
    orderedTime: queueItem.time || startTime,
    startTime
  };
  
  console.log("Set current singing:", appState.currentSinging);
  
  // Reset timer state
  appState.timeElapsed = 0;
  appState.timeIsUp = false;
  
  // Update displays first to make sure the timer element exists
  updateNowSingingDisplay();
  updateQueueDisplay();
  
  // Force a small delay before starting the timer
  setTimeout(() => {
    // Start timer
    startSongTimer();
    
    // Save data
    const updates = { 
      songQueue: appState.songQueue, 
      history: appState.history, 
      currentSinging: appState.currentSinging,
      spots: appState.spots,
      timeElapsed: appState.timeElapsed,
      timeIsUp: appState.timeIsUp
    };
    
    saveToFirebase(updates);
  }, 100);
}

// Start the next song (called when "Start Next" is clicked)
function startNextSong() {
  if (!appState.songQueue || appState.songQueue.length === 0) return;
  
  console.log("Starting next song");
  
  // Mark current song as complete
  markAsCompleted();
  
  // Start the next song
  const nextSong = appState.songQueue[0];
  startCurrentSong(nextSong.spotId, nextSong.songName);
}

// Start the next song while finishing the current one
function startNextAndFinishCurrent() {
  if (!appState.songQueue || appState.songQueue.length === 0 || !appState.currentSinging) return;
  
  console.log("Starting next song while finishing current");
  
  // Store the current song's information for history
  const currentSong = appState.currentSinging;
  
  // Get the next song's information before we remove it from the queue
  const nextSong = appState.songQueue[0];
  
  // Mark the current song as completed and add to history
  const historyItemId = currentSong.id;
  
  // Update history item if it exists
  if (appState.history) {
    const historyIndex = appState.history.findIndex(item => item.id === historyItemId);
    if (historyIndex >= 0) {
      appState.history[historyIndex].status = 'completed';
    }
  }
  
  // Clear timer
  if (appState.timer) {
    clearInterval(appState.timer);
    appState.timer = null;
  }
  
  // Start the next song immediately
  startCurrentSong(nextSong.spotId, nextSong.songName);
  
  // Show toast notification about the completed song
  showToast('Song Completed', `"${currentSong.songName}" has been marked as complete.`);
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
  console.log("Starting song timer...");
  
  // Clear any existing timer
  if (appState.timer) {
    clearInterval(appState.timer);
    appState.timer = null;
  }
  
  // Start new timer
  appState.timer = setInterval(() => {
    appState.timeElapsed++;
    console.log("Timer tick:", appState.timeElapsed);
    
    // Check if 3 minutes have passed (180 seconds)
    if (appState.timeElapsed >= 180 && !appState.timeIsUp) {
      appState.timeIsUp = true;
      console.log("Time is up!");
      updateNowSingingDisplay(); // Update display when time is up
      saveToFirebase({ timeElapsed: appState.timeElapsed, timeIsUp: true });
    }
    
    // Update the timer display every second for more responsive UI
    const timerDisplay = document.querySelector('#now-singing-container .rounded.bg-dark');
    if (timerDisplay) {
      timerDisplay.innerHTML = `<i class="fas fa-clock"></i> ${formatTime(appState.timeElapsed)} / 3:00`;
    }
      
    // Save time elapsed every 15 seconds
    if (appState.timeElapsed % 15 === 0) {
      saveToFirebase({ timeElapsed: appState.timeElapsed });
    }
  }, 1000);
  
  console.log("Timer started:", appState.timer);
}

// Update song name in queue
function updateSongName(index, newName) {
  if (index >= 0 && index < appState.songQueue.length) {
    const trimmedName = newName.trim();
    
    // Only update if name actually changed
    if (appState.songQueue[index].songName !== trimmedName) {
      console.log(`Updating song name at index ${index} to: ${trimmedName}`);
      appState.songQueue[index].songName = trimmedName;
      saveToFirebase({ songQueue: appState.songQueue });
      
      // If this is the first or second song in queue, update the "on deck" display
      if (index === 0 || index === 1) {
        updateNowSingingDisplay();
      }
    }
  }
}

// Move song up in queue
function moveSongUp(index) {
  if (index <= 0 || index >= appState.songQueue.length) return;
  
  console.log("Moving song up from index:", index);
  
  // Swap with previous song
  const temp = appState.songQueue[index];
  appState.songQueue[index] = appState.songQueue[index - 1];
  appState.songQueue[index - 1] = temp;
  
  // Save and update display
  saveToFirebase({ songQueue: appState.songQueue });
  updateQueueDisplay();
  
  // Update the "on deck" preview if we moved a song to position 0 or 1
  if (index === 1) {
    updateNowSingingDisplay();
  }
}

// Move song down in queue
function moveSongDown(index) {
  if (index < 0 || index >= appState.songQueue.length - 1) return;
  
  console.log("Moving song down from index:", index);
  
  // Swap with next song
  const temp = appState.songQueue[index];
  appState.songQueue[index] = appState.songQueue[index + 1];
  appState.songQueue[index + 1] = temp;
  
  // Save and update display
  saveToFirebase({ songQueue: appState.songQueue });
  updateQueueDisplay();
  
  // Update the "on deck" preview if we moved a song from position 0 or to position 0
  // or if the second song in queue changes (index 0 moving down or index 1 moving down)
  if (index === 0 || index === 1) {
    updateNowSingingDisplay();
  }
}

// Boost song to top of queue
function boostSongToTop(spotId, songName) {
  console.log("Boosting song to top:", songName);
  
  const songIndex = appState.songQueue.findIndex(item => 
    item.spotId === spotId && item.songName === songName
  );
  
  // Don't boost if song is already at the top or not found
  if (songIndex <= 0) {
    console.log("Song is already at the top or not found, index:", songIndex);
    return;
  }
  
  // Find song and move to top
  const songToBoost = appState.songQueue[songIndex];
  appState.songQueue.splice(songIndex, 1);
  appState.songQueue.unshift(songToBoost);
  
  console.log("Song boosted to top of queue");
  
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
  
  if (!appState.history) appState.history = [];
  appState.history.unshift(boostHistoryItem);
  
  // Save and update displays
  saveToFirebase({ 
    songQueue: appState.songQueue,
    history: appState.history
  });
  
  // Update both the queue and the "Now Singing" display to refresh the "on deck" preview
  updateQueueDisplay();
  updateNowSingingDisplay();
  
  showToast('Song Boosted', `"${songName}" has been boosted to the top of the queue.`);
}

// Build the Tables Tab UI
function buildTablesTab() {
  const tablesTab = document.getElementById('tables-tab');
  
  tablesTab.innerHTML = `
    <div class="card shadow">
      <div class="card-header bg-primary text-white">
        <h2 class="card-title mb-0"><i class="fas fa-chair"></i> Seats & Billing</h2>
      </div>
      <div class="card-body">
        
        <div class="row mb-3">
          <div class="col-12">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h3 class="mb-0"><i class="fas fa-chair"></i> Tables</h3>
              <div>
                <button class="btn btn-outline-primary" id="clear-all-tables-btn" onclick="clearAllTables()">
                  <i class="fas fa-broom"></i> Clear All Tables
                </button>
              </div>
            </div>
            <div class="table-responsive">
              <table class="table table-bordered table-hover">
                <thead class="table-dark">
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
                          <input type="text" class="form-control form-control-lg" 
                            value="${spot.occupant || ''}" 
                            placeholder="Enter name"
                            onchange="updateSpotOccupant('${spot.id}', this.value)">
                        </td>
                        <td class="text-center">
                          <input type="number" class="form-control form-control-lg text-center" style="width: 80px; margin: 0 auto;"
                            value="${spot.performedCount || 0}" min="0"
                            onchange="updateSpotCount('${spot.id}', this.value)">
                        </td>
                        <td class="text-center text-success fw-bold fs-5">
                          $${((spot.performedCount || 0) * 2).toFixed(2)}
                        </td>
                        <td class="text-center">
                          <button class="btn btn-success" 
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
        
        <div class="row">
          <div class="col-12">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h3 class="mb-0"><i class="fas fa-glass-martini-alt"></i> Bar Seats</h3>
              <div>
                <button class="btn btn-outline-primary" id="clear-all-bar-btn" onclick="clearAllBarSeats()">
                  <i class="fas fa-broom"></i> Clear All Bar Seats
                </button>
              </div>
            </div>
            <div class="table-responsive">
              <table class="table table-bordered table-hover">
                <thead class="table-dark">
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
                          <input type="text" class="form-control form-control-lg" 
                            value="${spot.occupant || ''}" 
                            placeholder="Enter name"
                            onchange="updateSpotOccupant('${spot.id}', this.value)">
                        </td>
                        <td class="text-center">
                          <input type="number" class="form-control form-control-lg text-center" style="width: 80px; margin: 0 auto;"
                            value="${spot.performedCount || 0}" min="0"
                            onchange="updateSpotCount('${spot.id}', this.value)">
                        </td>
                        <td class="text-center text-success fw-bold fs-5">
                          $${((spot.performedCount || 0) * 2).toFixed(2)}
                        </td>
                        <td class="text-center">
                          <button class="btn btn-success" 
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
    
    showToast('Seat Cleared', `${appState.spots[spotId].name} has been marked as paid and cleared.`);
  }
}

// Clear all tables at once
function clearAllTables() {
  if (confirm('Are you sure you want to clear all tables? This will reset all occupants and song counts.')) {
    // Clear all table spots
    Object.values(appState.spots)
      .filter(spot => spot.id.startsWith('table_'))
      .forEach(spot => {
        spot.occupant = '';
        spot.performedCount = 0;
      });
    
    saveToFirebase({ spots: appState.spots });
    buildTablesTab();
    
    // Update queue tab if visible
    if (document.getElementById('queue-tab').style.display !== 'none') {
      buildQueueTab();
    }
    
    showToast('Tables Cleared', 'All tables have been marked as paid and cleared.');
  }
}

// Clear all bar seats at once
function clearAllBarSeats() {
  if (confirm('Are you sure you want to clear all bar seats? This will reset all occupants and song counts.')) {
    // Clear all bar spots
    Object.values(appState.spots)
      .filter(spot => spot.id.startsWith('bar_'))
      .forEach(spot => {
        spot.occupant = '';
        spot.performedCount = 0;
      });
    
    saveToFirebase({ spots: appState.spots });
    buildTablesTab();
    
    // Update queue tab if visible
    if (document.getElementById('queue-tab').style.display !== 'none') {
      buildQueueTab();
    }
    
    showToast('Bar Seats Cleared', 'All bar seats have been marked as paid and cleared.');
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

// Build the History Tab UI
function buildHistoryTab() {
  const historyTab = document.getElementById('history-tab');
  
  // Initialize song prices in history if they don't exist
  if (appState.history) {
    appState.history.forEach(item => {
      // Default price is $2 for all songs if not already set
      if (item.price === undefined) {
        item.price = 2;
      }
    });
  }
  
  // Calculate summary statistics
  const totalSongs = appState.history ? appState.history.length : 0;
  const boostedSongs = appState.history ? appState.history.filter(item => item.status === 'boosted').length : 0;
  const regularSongs = totalSongs - boostedSongs;
  
  // Calculate total revenue based on individual song prices
  const totalRevenue = appState.history ? 
    appState.history.reduce((total, item) => total + (item.price || 0), 0) : 0;
  
  historyTab.innerHTML = `
    <div class="card shadow">
      <div class="card-header bg-secondary text-white">
        <div class="d-flex justify-content-between align-items-center">
          <h2 class="card-title mb-0">
            <i class="fas fa-history"></i> Song History & Pricing
          </h2>
          <div class="btn-group">
            <button class="btn btn-warning" onclick="startNewShift()">
              <i class="fas fa-sync-alt"></i> Start New Shift
            </button>
            <button class="btn btn-danger" onclick="clearHistory()">
              <i class="fas fa-trash-alt"></i> Clear History
            </button>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="alert alert-info mb-4">
          <div class="row align-items-center">
            <div class="col-md-6">
              <h4 class="mb-2"><i class="fas fa-dollar-sign"></i> Song Pricing</h4>
              <p class="mb-1">Standard song price is $2. Adjust individual prices as needed.</p>
            </div>
            <div class="col-md-6">
              <div class="d-flex justify-content-end align-items-center gap-2">
                <button class="btn btn-primary me-2" onclick="setAllSongPrices(2)">
                  <i class="fas fa-sync-alt"></i> Reset All To $2
                </button>
                <button class="btn btn-outline-success" onclick="setAllSongPrices(0)">
                  <i class="fas fa-dollar-sign"></i> Make All Free
                </button>
              </div>
            </div>
          </div>
        </div>
        ${!appState.history || appState.history.length === 0 ? 
          `<div class="text-center text-muted py-5">
            <i class="fas fa-history fa-3x mb-3"></i>
            <p class="lead">No song history yet</p>
            <p>Song performances will be recorded here</p>
          </div>` :
          `
          <div class="table-responsive">
            <table class="table table-hover">
              <thead class="table-dark">
                <tr>
                  <th>Time</th>
                  <th>Seat / Customer</th>
                  <th>Song</th>
                  <th>Status</th>
                  <th class="text-center">Price</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${appState.history.map((item, index) => `
                  <tr class="${item.status === 'boosted' ? 'table-danger bg-opacity-25' : ''}">
                    <td>
                      <strong>${item.startTime || '-'}</strong><br>
                      <small class="text-muted">Ordered: ${item.orderedTime || '-'}</small>
                    </td>
                    <td>
                      <strong>${item.spotName || '-'}</strong><br>
                      <small class="text-muted">${item.occupant || '-'}</small>
                    </td>
                    <td>
                      <strong>${item.songName || '-'}</strong>
                    </td>
                    <td>
                      ${item.status === 'boosted' ? 
                        '<span class="badge bg-danger px-2 py-2"><i class="fas fa-bolt"></i> Boosted</span>' : 
                        '<span class="badge bg-success px-2 py-2"><i class="fas fa-music"></i> Standard</span>'}
                    </td>
                    <td class="text-center">
                      <div class="input-group">
                        <span class="input-group-text">$</span>
                        <input type="number" class="form-control text-center" 
                          value="${item.price || 0}" min="0" step="1"
                          onchange="updateSongPrice(${index}, this.value)">
                      </div>
                    </td>
                    <td class="text-center">
                      <div class="btn-group">
                        <button class="btn btn-sm btn-outline-secondary" onclick="updateSongPrice(${index}, 0)" title="Make Free">
                          $0
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="updateSongPrice(${index}, 2)" title="Standard Price">
                          $2
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot class="table-light">
                <tr>
                  <td colspan="4" class="text-end fw-bold">Total Revenue:</td>
                  <td class="text-center text-success fw-bold fs-4">$${totalRevenue.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div class="card mt-4 bg-light border">
            <div class="card-body">
              <h3 class="card-title">
                <i class="fas fa-chart-bar"></i> Daily Summary
              </h3>
              <div class="row">
                <div class="col-md-4">
                  <div class="card bg-primary text-white mb-3">
                    <div class="card-body text-center">
                      <h5 class="card-title">Regular Songs</h5>
                      <p class="display-6">${regularSongs}</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="card bg-danger text-white mb-3">
                    <div class="card-body text-center">
                      <h5 class="card-title">Boosted Songs</h5>
                      <p class="display-6">${boostedSongs}</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="card bg-success text-white mb-3">
                    <div class="card-body text-center">
                      <h5 class="card-title">Total Revenue</h5>
                      <p class="display-6">$${totalRevenue.toFixed(2)}</p>
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

// Set the price for all songs in history
function setAllSongPrices(newPrice) {
  // Convert to a proper number, minimum 0
  const price = Math.max(0, parseFloat(newPrice) || 0);
  
  if (!appState.history || appState.history.length === 0) {
    showToast('No History', 'There are no songs in history to update prices for.');
    return;
  }
  
  // Confirm with user if there are many songs
  if (appState.history.length > 5) {
    if (!confirm(`Are you sure you want to set the price of all ${appState.history.length} songs to $${price.toFixed(2)}?`)) {
      return;
    }
  }
  
  console.log(`Setting all song prices to: $${price}`);
  
  // Update all song prices
  appState.history.forEach(item => {
    item.price = price;
  });
  
  // Save and update display
  saveToFirebase({ history: appState.history });
  buildHistoryTab();
  
  // Update the tables tab if it's visible (to keep the billing consistent)
  if (document.getElementById('tables-tab').style.display !== 'none') {
    buildTablesTab();
  }
  
  // Show confirmation toast
  showToast('Prices Updated', `All songs now set to $${price.toFixed(2)}.`);
}

// Update song price in history
function updateSongPrice(index, newPrice) {
  if (index >= 0 && index < appState.history.length) {
    // Convert to a proper number, minimum 0
    const price = Math.max(0, parseFloat(newPrice) || 0);
    
    console.log(`Updating song price at index ${index} to: $${price}`);
    appState.history[index].price = price;
    
    // Save and update display
    saveToFirebase({ history: appState.history });
    buildHistoryTab();
    
    // Update the tables tab if it's visible (to keep the billing consistent)
    if (document.getElementById('tables-tab').style.display !== 'none') {
      buildTablesTab();
    }
    
    // Show confirmation toast
    showToast('Price Updated', `Song price updated to $${price.toFixed(2)}.`);
  }
}

// Start a new shift - clear history, reset spots, clear queue
function startNewShift() {
  if (confirm('Are you sure you want to start a new shift? This will clear all history, reset all tables/seats, and clear the song queue.')) {
    // Clear song history
    appState.history = [];
    
    // Reset all tables and bar seats
    Object.values(appState.spots).forEach(spot => {
      spot.occupant = '';
      spot.performedCount = 0;
    });
    
    // Clear song queue
    appState.songQueue = [];
    
    // Clear current singing
    appState.currentSinging = null;
    
    // Reset timer
    if (appState.timer) {
      clearInterval(appState.timer);
      appState.timer = null;
    }
    appState.timeElapsed = 0;
    appState.timeIsUp = false;
    
    // Save all changes
    saveToFirebase({ 
      history: appState.history,
      spots: appState.spots,
      songQueue: appState.songQueue,
      currentSinging: null,
      timeElapsed: 0,
      timeIsUp: false
    });
    
    // Rebuild all tabs
    if (document.getElementById('queue-tab').style.display !== 'none') {
      buildQueueTab();
    }
    if (document.getElementById('tables-tab').style.display !== 'none') {
      buildTablesTab();
    }
    buildHistoryTab();
    
    showToast('New Shift Started', 'All tables, history, and queue have been reset.');
  }
}

// Clear history only
function clearHistory() {
  if (confirm('Are you sure you want to clear the entire history? This will not affect tables or the song queue.')) {
    appState.history = [];
    saveToFirebase({ history: appState.history });
    buildHistoryTab();
    showToast('History Cleared', 'All song history has been deleted.');
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

// Make all functions available globally
window.updateSongName = updateSongName;
window.moveSongUp = moveSongUp;
window.moveSongDown = moveSongDown;
window.boostSongToTop = boostSongToTop;
window.startCurrentSong = startCurrentSong;
window.startNextSong = startNextSong;
window.startNextAndFinishCurrent = startNextAndFinishCurrent;
window.markAsCompleted = markAsCompleted;
window.updateSpotOccupant = updateSpotOccupant;
window.updateSpotCount = updateSpotCount;
window.markSpotAsPaid = markSpotAsPaid;
window.clearAllTables = clearAllTables;
window.clearAllBarSeats = clearAllBarSeats;
window.clearHistory = clearHistory;
window.startNewShift = startNewShift;
window.updateSongPrice = updateSongPrice;
window.setAllSongPrices = setAllSongPrices;
window.signInWithGoogleHandler = signInWithGoogleHandler;
window.signInWithAppleHandler = signInWithAppleHandler;
window.useWithoutLogin = useWithoutLogin;