// Firebase Initialization
// 1. Create a NEW project at https://console.firebase.google.com/
// 2. Select "Add App" -> "Web"
// 3. Copy the "firebaseConfig" object they give you and PASTE it below:

const firebaseConfig = {
    apiKey: "PASTE_YOUR_API_KEY_HERE",
    authDomain: "PROJECT_ID.firebaseapp.com",
    databaseURL: "https://PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "PROJECT_ID",
    storageBucket: "PROJECT_ID.firebasestorage.app",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase Initialized");
} catch (e) {
    console.error("Firebase Init Error (Did you update firebase-init.js?):", e);
}

const db = firebase.database();
window.db = db;
