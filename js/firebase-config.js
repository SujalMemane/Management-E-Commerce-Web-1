/**
 * ForgeAdmin — Firebase Configuration
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com
 * 2. Create (or open) your project
 * 3. Project Settings → General → Your apps → Add Web App
 * 4. Copy the config values below
 * 5. Enable Authentication → Sign-in method → Email/Password
 * 6. Build → Firestore Database → Create database (start in test mode)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCiasPOawO_890pGm-qtyx7GyzAVhnvtyI",
  authDomain:        "management-e-commerce-we-b8dda.firebaseapp.com",
  projectId:         "management-e-commerce-we-b8dda",
  storageBucket:     "management-e-commerce-we-b8dda.firebasestorage.app",
  messagingSenderId: "383474957316",
  appId:             "1:383474957316:web:bc402de7a24653b2780951"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);

// Optional: connect to Auth Emulator for local development
// connectAuthEmulator(auth, "http://localhost:9099");
// connectFirestoreEmulator(db, 'localhost', 8080);

export default app;
