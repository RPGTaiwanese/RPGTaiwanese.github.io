// Chat Room Firebase JS File

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
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

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const database = getDatabase(app);

  const styles = `
    .chat-btn, .chat-window, .sticker-panel { position: fixed; z-index: 1000; }
    .chat-btn { bottom: 20px; right: 20px; background: #007bff; color: white; padding: 15px; border-radius: 50%; cursor: pointer; }
    .chat-window { bottom: 80px; right: 20px; width: 300px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: none; flex-direction: column; }
    .chat-header, .chat-input-container { background: #007bff; color: white; padding: 10px; display: flex; justify-content: space-between; }
    .chat-messages { flex: 1; padding: 10px; overflow-y: auto; background: #f1f1f1; }
    .chat-input { flex: 1; padding: 10px; border: none; }
    .sticker-panel { bottom: 50px; right: 0; width: 280px; background: white; border: 1px solid #ccc; display: none; flex-wrap: wrap; }
    .sticker-panel img { width: 60px; height: 60px; margin: 5px; cursor: pointer; }
  `;
  
  const styleTag = document.createElement("style");
  styleTag.textContent = styles;
  document.head.appendChild(styleTag);

  document.body.insertAdjacentHTML("beforeend", `
    <div class="chat-btn">Chat</div>
    <div class="chat-window">
      <div class="chat-header">Chat Room <button id="close-btn">&times;</button></div>
      <div class="chat-messages"></div>
      <div class="chat-input-container">
        <input class="chat-input" placeholder="Type your message..." disabled />
        <button class="chat-send">Send</button>
      </div>
      <div class="sticker-panel"></div>
    </div>
  `);

  const chatBtn = document.querySelector(".chat-btn");
  const chatWindow = document.querySelector(".chat-window");
  const closeBtn = document.getElementById("close-btn");
  const inputField = document.querySelector(".chat-input");
  const sendButton = document.querySelector(".chat-send");
  
  chatBtn.addEventListener("click", () => chatWindow.style.display = "flex");
  closeBtn.addEventListener("click", () => chatWindow.style.display = "none");
  
  onAuthStateChanged(auth, (user) => {
    inputField.disabled = !user;
    sendButton.disabled = !user;
  });

  sendButton.addEventListener("click", () => {
    if (inputField.value.trim() !== "") {
      push(ref(database, 'messages'), { text: inputField.value.trim(), timestamp: Date.now() });
      inputField.value = "";
    }
  });

  onChildAdded(ref(database, 'messages'), (data) => {
    const msg = document.createElement("div");
    msg.textContent = data.val().text;
    document.querySelector(".chat-messages").appendChild(msg);
  });
});
