import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Cấu hình Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB5xlnu5gvkiq1zvNYckFRpP9HpfkIwMrM",
  authDomain: "my-lms-web.firebaseapp.com",
  projectId: "my-lms-web",
  storageBucket: "my-lms-web.firebasestorage.app",
  messagingSenderId: "839804354182",
  appId: "1:839804354182:web:06e480cb6e3be4ccd11b07"
};

// Initialize Firebase safely
let auth: any;
let db: any;
let firebaseInitialized = false;

try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  firebaseInitialized = true;
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { auth, db, firebaseInitialized };