/**
 * online-users-display.js
 *
 * Description:
 * This script uses Firebase Authentication (with Google sign‐in) and Firebase Realtime Database
 * to display in the top-right corner of your webpage the number of online users (who have signed in via Google)
 * and a list of their display names. The current user’s name is always shown first in the list.
 *
 * Usage:
 * 1. Place this file in the "online-users-display" folder.
 * 2. In your HTML file, include this module:
 *      <script type="module" src="online-users-display/online-users-display.js"></script>
 * 3. Ensure that your project includes the Firebase SDK from CDN.
 *
 * Note: This file assumes that your Firebase project is properly set up with Authentication and Realtime Database.
 */

// Import the functions you need from the Firebase SDKs via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, onValue, set, onDisconnect } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Your web app's Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

let currentUser = null;

// Create a container div for the online users display (placed in top-right)
const onlineUsersContainer = document.createElement("div");
onlineUsersContainer.id = "online-users-display";
onlineUsersContainer.style.position = "fixed";
onlineUsersContainer.style.top = "10px";
onlineUsersContainer.style.right = "10px";
onlineUsersContainer.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
onlineUsersContainer.style.border = "1px solid #ccc";
onlineUsersContainer.style.padding = "10px";
onlineUsersContainer.style.zIndex = "9999";
document.body.appendChild(onlineUsersContainer);

/**
 * updateOnlineUsersDisplay
 * Updates the display with the current online users.
 *
 * @param {object} usersObj - The object from the Realtime Database representing online users.
 */
function updateOnlineUsersDisplay(usersObj) {
  let users = [];
  for (let uid in usersObj) {
    users.push({
      uid: uid,
      displayName: usersObj[uid].displayName || "Anonymous"
    });
  }
  
  // Sort users so that the current user's name is first.
  users.sort((a, b) => {
    if (currentUser && a.uid === currentUser.uid) return -1;
    if (currentUser && b.uid === currentUser.uid) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
  
  // Build HTML: display online count and list of names.
  let html = `<strong>Online Users (${users.length})</strong><br><ul style="list-style: none; padding: 0; margin: 0;">`;
  users.forEach(user => {
    html += `<li>${user.displayName}</li>`;
  });
  html += "</ul>";
  
  onlineUsersContainer.innerHTML = html;
}

// Listen for changes to the onlineUsers node in Realtime Database.
const onlineUsersRef = ref(db, "onlineUsers");
onValue(onlineUsersRef, (snapshot) => {
  const data = snapshot.val() || {};
  updateOnlineUsersDisplay(data);
});

/**
 * setUserOnline
 * Marks the current user as online in the Realtime Database and sets up a disconnection handler.
 *
 * @param {object} user - The authenticated user object.
 */
function setUserOnline(user) {
  const userStatusRef = ref(db, "onlineUsers/" + user.uid);
  // Set the user's display name
  set(userStatusRef, {
    displayName: user.displayName || "Anonymous"
  });
  // Remove the user from the online list when they disconnect
  onDisconnect(userStatusRef).remove();
}

/**
 * displaySignInButton
 * Displays a sign-in button in the center of the screen. The sign-in process will only be
 * triggered when the user clicks the button (avoiding popup blockers).
 */
function displaySignInButton() {
  let signInButton = document.getElementById('google-signin-btn');
  if (!signInButton) {
    signInButton = document.createElement('button');
    signInButton.id = 'google-signin-btn';
    signInButton.textContent = "Sign in with Google";
    signInButton.style.position = "fixed";
    signInButton.style.top = "50%";
    signInButton.style.left = "50%";
    signInButton.style.transform = "translate(-50%, -50%)";
    signInButton.style.padding = "10px 20px";
    signInButton.style.zIndex = "10000";
    document.body.appendChild(signInButton);
    
    signInButton.addEventListener('click', () => {
      signInWithPopup(auth, provider)
        .then((result) => {
          currentUser = result.user;
          setUserOnline(result.user);
          hideSignInButton();
        })
        .catch((error) => {
          console.error("Error during sign-in:", error);
        });
    });
  }
}

/**
 * hideSignInButton
 * Removes the sign-in button from the DOM.
 */
function hideSignInButton() {
  const signInButton = document.getElementById('google-signin-btn');
  if (signInButton) {
    signInButton.remove();
  }
}

// Monitor authentication state changes.
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    setUserOnline(user);
    hideSignInButton();
  } else {
    // Instead of auto-triggering signInWithPopup (which can be blocked),
    // show a sign-in button for the user to click.
    displaySignInButton();
  }
});
