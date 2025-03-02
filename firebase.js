// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, arrayUnion, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Check if user is logged in
export function checkAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

// Sign in
export async function signIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Sign up
export async function signUp(email, password, venueName) {
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
    return { success: false, error: error.message };
  }
}

// Sign out
export async function logOut() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Save venue data
export async function saveVenueData(userId, data) {
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
  try {
    const venueRef = doc(db, "venues", userId);
    await updateDoc(venueRef, {
      songDatabase: arrayUnion(songData)
    });
    return { success: true };
  } catch (error) {
    console.error("Error adding song to database:", error);
    return { success: false, error: error.message };
  }
}

// Search song database
export async function searchSongDatabase(userId, searchTerm) {
  try {
    const venueData = await getVenueData(userId);
    
    if (!venueData.success) {
      return { success: false, error: venueData.error };
    }
    
    const songDatabase = venueData.data.songDatabase || [];
    const searchTermLower = searchTerm.toLowerCase();
    
    const results = songDatabase.filter(song => 
      song.title.toLowerCase().includes(searchTermLower) || 
      song.artist.toLowerCase().includes(searchTermLower)
    );
    
    return { success: true, results };
  } catch (error) {
    console.error("Error searching song database:", error);
    return { success: false, error: error.message };
  }
}

export { db, auth };
