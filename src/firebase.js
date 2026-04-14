// ─────────────────────────────────────────────────────────────
//  SETUP INSTRUCTIONS
//  1. Go to https://console.firebase.google.com
//  2. Create a project (or open an existing one)
//  3. Click "Add app" → Web (</>)
//  4. Register the app — Firebase will show you a config object
//  5. Paste your values into the fields below
//  6. In Firebase console → Firestore Database → Create database
//     (start in test mode for now, lock down rules later)
// ─────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBXHkEMWAmA7Ba8U1z6wRz5XebP1wcHk5I",

  authDomain: "pangolin-f37fa.firebaseapp.com",

  projectId: "pangolin-f37fa",

  storageBucket: "pangolin-f37fa.firebasestorage.app",

  messagingSenderId: "880099895366",

  appId: "1:880099895366:web:a59514315ad16294b0c247",

  measurementId: "G-RPL4SNRZQ4",
};

const isConfigured = Object.values(firebaseConfig).every(
  (v) => !v.startsWith("YOUR_")
);

export const configured = isConfigured;
export const db = isConfigured
  ? getFirestore(initializeApp(firebaseConfig))
  : null;
