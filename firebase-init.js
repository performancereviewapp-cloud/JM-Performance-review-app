// Firebase Initialization
// Using project: jm-performance-review-system

const firebaseConfig = {
    apiKey: "AIzaSyCZkvJ1KWtk9lajdQ_Is-yqZQwdt9IBxCs",
    authDomain: "jm-performance-review-system.firebaseapp.com",
    // Standard Realtime Database URL pattern
    databaseURL: "https://jm-performance-review-system-default-rtdb.firebaseio.com",
    projectId: "jm-performance-review-system",
    storageBucket: "jm-performance-review-system.firebasestorage.app",
    messagingSenderId: "292284863564",
    appId: "1:292284863564:web:bb5c24890de7b1a82610e9",
    measurementId: "G-VB3MTG9RH3"
};

// Initialize Firebase (using CDN scripts from index.html)
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase Initialized Successfully");
} catch (e) {
    console.error("Error Initializing Firebase:", e);
    alert("Firebase Configuration Error. Check console.");
}

// Export Database Reference
const db = firebase.database();
window.db = db;
