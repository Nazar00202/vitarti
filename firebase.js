import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCrePdAYPWbiAb1xXKI6hYC06Ys5fbNNDg",
  authDomain: "teaxyz-4e151.firebaseapp.com",
  projectId: "teaxyz-4e151",
  storageBucket: "teaxyz-4e151.firebasestorage.app",
  messagingSenderId: "961074047130",
  appId: "1:961074047130:web:ae9be45c67b526385a1723",
  measurementId: "G-GY5KDCDNX5"
}; // ← ОЦЕГО НЕ ВИСТАЧАЛО

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// 🔥 AUTH
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();