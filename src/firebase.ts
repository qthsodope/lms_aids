import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- Thay config của bạn vào đây ---
const firebaseConfig = {
  apiKey: "AIzaSyDmlD1MprThgthzZqQn28gQclEpRq3fXUc",
  authDomain: "my-lms-learning.firebaseapp.com",
  projectId: "my-lms-learning",
  storageBucket: "my-lms-learning.firebasestorage.app",
  messagingSenderId: "1033557764010",
  appId: "1:1033557764010:web:5c6a51b107f1c5e220add3"
};

let app;
let auth: any;
let db: any;
let firebaseInitialized = false;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  firebaseInitialized = true;
  console.log("✅ Kết nối Firebase thành công!");
} catch (error) {
  console.error("❌ Lỗi kết nối Firebase:", error);
}

export { auth, db, firebaseInitialized };