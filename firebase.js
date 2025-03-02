// firebase.js
// Using CDN imports instead of npm modules

// Firebase configuration
// TODO: Replace with your own Firebase project configuration from:
// https://console.firebase.google.com/ > Your Project > Project Settings > Add Web App
const firebaseConfig = {
  apiKey: "YOUR_NEW_API_KEY",
  authDomain: "your-new-project-id.firebaseapp.com",
  projectId: "your-new-project-id",
  storageBucket: "your-new-project-id.appspot.com",
  messagingSenderId: "YOUR_NEW_SENDER_ID",
  appId: "YOUR_NEW_APP_ID"
};

// Import Firebase modules from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  OAuthProvider
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let app, auth, db;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// Check if user is logged in
export function checkAuthState(callback) {
  if (!auth) {
    console.error("Auth not initialized");
    callback(null);
    return () => {};
  }
  
  try {
    return onAuthStateChanged(auth, callback);
  } catch (error) {
    console.error("Error checking auth state:", error);
    callback(null);
    return () => {};
  }
}

// Sign in with email and password
export async function signIn(email, password) {
  if (!auth) {
    return { success: false, error: "Firebase Authentication not initialized" };
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Sign in error:", error);
    return { success: false, error: error.message };
  }
}

// Sign up with email and password
export async function signUp(email, password, venueName) {
  if (!auth || !db) {
    return { success: false, error: "Firebase services not initialized" };
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create venue document
    await setDoc(doc(db, "venues", userCredential.user.uid), {
      venueName: venueName,
      email: email,
      createdAt: new Date().toISOString(),
      spots: {},
      songDatabase: []
    });
    
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Sign up error:", error);
    return { success: false, error: error.message };
  }
}

// Sign in with Google
export async function signInWithGoogle() {
  if (!auth || !db) {
    return { success: false, error: "Firebase services not initialized" };
  }
  
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    
    // Check if this is a new user by trying to get their venue document
    const venueDoc = await getDoc(doc(db, "venues", userCredential.user.uid));
    
    if (!venueDoc.exists()) {
      // Create venue document for new Google users
      await setDoc(doc(db, "venues", userCredential.user.uid), {
        venueName: "My Karaoke Venue",
        email: userCredential.user.email,
        createdAt: new Date().toISOString(),
        spots: {},
        songDatabase: []
      });
    }
    
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Google sign-in error:", error);
    return { success: false, error: error.message };
  }
}

// Sign in with Apple
export async function signInWithApple() {
  if (!auth || !db) {
    return { success: false, error: "Firebase services not initialized" };
  }
  
  try {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    
    const userCredential = await signInWithPopup(auth, provider);
    
    // Check if this is a new user by trying to get their venue document
    const venueDoc = await getDoc(doc(db, "venues", userCredential.user.uid));
    
    if (!venueDoc.exists()) {
      // Create venue document for new Apple users
      await setDoc(doc(db, "venues", userCredential.user.uid), {
        venueName: "My Karaoke Venue",
        email: userCredential.user.email,
        createdAt: new Date().toISOString(),
        spots: {},
        songDatabase: []
      });
    }
    
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Apple sign-in error:", error);
    return { success: false, error: error.message };
  }
}

// Sign out
export async function logOut() {
  if (!auth) {
    return { success: false, error: "Firebase Authentication not initialized" };
  }
  
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, error: error.message };
  }
}

// Save venue data
export async function saveVenueData(userId, data) {
  if (!db) {
    return { success: false, error: "Firebase Firestore not initialized" };
  }
  
  try {
    const venueRef = doc(db, "venues", userId);
    await updateDoc(venueRef, data);
    return { success: true };
  } catch (error) {
    console.error("Error saving venue data:", error);
    return { success: false, error: error.message };
  }
}

// Get venue data
export async function getVenueData(userId) {
  if (!db) {
    return { success: false, error: "Firebase Firestore not initialized" };
  }
  
  try {
    const venueRef = doc(db, "venues", userId);
    const venueSnap = await getDoc(venueRef);
    
    if (venueSnap.exists()) {
      return { success: true, data: venueSnap.data() };
    } else {
      return { success: false, error: "Venue not found" };
    }
  } catch (error) {
    console.error("Error getting venue data:", error);
    return { success: false, error: error.message };
  }
}

// Add song to database
export async function addSongToDatabase(userId, songData) {
  if (!db) {
    return { success: false, error: "Firebase Firestore not initialized" };
  }
  
  try {
    // Get current song database
    const venueDoc = await getDoc(doc(db, "venues", userId));
    if (!venueDoc.exists()) {
      return { success: false, error: "Venue not found" };
    }
    
    const venueData = venueDoc.data();
    const songDatabase = venueData.songDatabase || [];
    
    // Add new song
    songDatabase.push(songData);
    
    // Update venue document
    await updateDoc(doc(db, "venues", userId), {
      songDatabase: songDatabase
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error adding song to database:", error);
    return { success: false, error: error.message };
  }
}

// Make Firebase objects available globally
window.firebase = {
  signIn,
  signUp,
  signInWithGoogle,
  signInWithApple,
  logOut,
  saveVenueData,
  getVenueData,
  addSongToDatabase,
  checkAuthState
};

export { db, auth };