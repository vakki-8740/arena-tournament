// ================================================
// FIREBASE CONFIGURATION
// ================================================
// Yeh file Firebase Console se milne wala config hai
// Tumhe apna config yahan paste karna hoga
//
// Steps:
// 1. https://console.firebase.google.com pe jao
// 2. Apna project select karo
// 3. Gear icon > Project Settings
// 4. "Your apps" section mein Web app banao
// 5. Config copy karo aur neeche paste karo
// ================================================

const firebaseConfig = {
  apiKey: "AIzaSyDgpxfAcGZS_s33PAdZDSQLSAjulENCgfg",
  authDomain: "arena-tournament-f2f8e.firebaseapp.com",
  projectId: "arena-tournament-f2f8e",
  storageBucket: "arena-tournament-f2f8e.firebasestorage.app",
  messagingSenderId: "937940312175",
  appId: "1:937940312175:web:7837d22b8c233db91ced9a"
};

// Firebase initialize karo
firebase.initializeApp(firebaseConfig);

// Auth reference
const auth = firebase.auth();

// Google provider banao
const googleProvider = new firebase.auth.GoogleAuthProvider();
