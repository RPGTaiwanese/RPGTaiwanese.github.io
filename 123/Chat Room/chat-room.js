// Firebase SDK 模組匯入
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { getDatabase, ref, push, onChildAdded } from "firebase/database";

// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyDt9mJRH-BHlEksl4xla32sVIUGVnLUxWY",
  authDomain: "future-infusion-368721.firebaseapp.com",
  databaseURL: "https://future-infusion-368721-default-rtdb.firebaseio.com",
  projectId: "future-infusion-368721",
  storageBucket: "future-infusion-368721.firebasestorage.app",
  messagingSenderId: "345445420847",
  appId: "1:345445420847:web:070778c173ec6157c6dbda",
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// 建立聊天室 UI
const chatContainer = document.createElement('div');
chatContainer.id = "firebase-chat-container";

const chatToggleBtn = document.createElement('div');
chatToggleBtn.id = "chat-toggle-btn";
chatToggleBtn.innerHTML = "💬";
chatToggleBtn.style.fontSize = "24px"; // 放大按鈕

const chatPanel = document.createElement('div');
chatPanel.id = "chat-panel";
chatPanel.style.display = "none";

chatContainer.appendChild(chatPanel);
chatContainer.appendChild(chatToggleBtn);
document.body.appendChild(chatContainer);

// 按鈕點擊事件
chatToggleBtn.addEventListener('click', () => {
  chatPanel.classList.toggle('open');
});

// Firebase 登入與登出
function signIn() {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider).catch(error => console.error("登入錯誤：", error));
}

function signOutUser() {
  signOut(auth).catch(error => console.error("登出錯誤：", error));
}

// 監聽使用者狀態
onAuthStateChanged(auth, (user) => {
  updateChatPanel(user);
});

// 更新聊天室 UI
function updateChatPanel(user) {
  chatPanel.innerHTML = "";
  if (user) {
    const header = document.createElement('div');
    header.textContent = `歡迎, ${user.displayName}`;
    chatPanel.appendChild(header);
    const signOutBtn = document.createElement('button');
    signOutBtn.textContent = "登出";
    signOutBtn.addEventListener('click', signOutUser);
    chatPanel.appendChild(signOutBtn);
  } else {
    const signInBtn = document.createElement('button');
    signInBtn.textContent = "Google 登入";
    signInBtn.addEventListener('click', signIn);
    chatPanel.appendChild(signInBtn);
  }
}
