import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDt9mJRH-BHlEksl4xla32sVIUGVnLUxWY",
  authDomain: "future-infusion-368721.firebaseapp.com",
  databaseURL: "https://future-infusion-368721-default-rtdb.firebaseio.com",
  projectId: "future-infusion-368721",
  storageBucket: "future-infusion-368721.firebasestorage.app",
  messagingSenderId: "345445420847",
  appId: "1:345445420847:web:070778c173ec6157c6dbda",
  measurementId: "G-57PJMMNNWW"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const analytics = getAnalytics(app);
const db = getDatabase(app);
const firestore = getFirestore(app);

export { app, analytics, db, firestore };