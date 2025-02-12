/**
 * Firebase Chat Room Module
 * 
 * 功能說明：
 * - 在網頁右下角出現一個浮動的聊天按鈕 (💬)。
 * - 點擊按鈕後會展開聊天室視窗。
 * - 若使用者已使用 Google 登入，聊天室會顯示使用者的 Google 大頭貼，
 *   並顯示聊天室內容與輸入區，可即時發送/接收訊息（使用 Firebase Realtime Database）。
 * - 若使用者尚未登入，聊天室畫面會顯示「Google 登入」按鈕，點擊後可使用 Google 帳號登入。
 *
 * 使用說明：
 * 1. 請將此檔案存放於您的 "Chat Room" 資料夾中 (例如檔名為 chat-room.js)。
 * 2. 在網頁中引入此 JS 檔，範例如下：
 *
 *    <script type="module" src="Chat Room/chat-room.js"></script>
 *
 * 3. 請確認您已於 Firebase 主控台啟用 Google 驗證，並正確設定 Realtime Database。
 * 4. 若需要修改樣式，可自行調整下方程式碼中的 CSS 部分。
 *
 * Firebase 專案設定如下：
 */
 
// Firebase SDK 模組匯入
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
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
  measurementId: "G-57PJMMNNWW"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

// 變數
let messagesContainer = null;
let messagesListenerAdded = false;

/* ---------------------------
   1. 建立並注入聊天室 CSS 樣式
--------------------------- */
const style = document.createElement('style');
style.textContent = `
  #firebase-chat-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    font-family: Arial, sans-serif;
  }
  #chat-toggle-btn {
    width: 50px;
    height: 50px;
    background-color: #007bff;
    border-radius: 50%;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }
  #chat-panel {
    display: none;
    width: 400px;
    height: 500px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    position: relative;
    margin-bottom: 10px;
  }
  #chat-panel.open {
    display: block;
  }
  #chat-header {
    background: #007bff;
    color: white;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  #enlarge-chat {
    background: white;
    border: none;
    cursor: pointer;
    font-size: 16px;
    margin-left: auto;
  }
  #chat-messages {
    height: calc(100% - 100px);
    overflow-y: auto;
    padding: 10px;
    background: #f9f9f9;
  }
  #chat-input {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    display: flex;
    border-top: 1px solid #ccc;
  }
  #chat-input input {
    flex: 1;
    border: none;
    padding: 10px;
    outline: none;
  }
  #chat-input button {
    border: none;
    padding: 10px;
    background: #007bff;
    color: white;
    cursor: pointer;
  }
`;
document.head.appendChild(style);

// 建立 UI
const chatContainer = document.createElement('div');
chatContainer.id = "firebase-chat-container";

const chatToggleBtn = document.createElement('div');
chatToggleBtn.id = "chat-toggle-btn";
chatToggleBtn.innerHTML = "💬";

const chatPanel = document.createElement('div');
chatPanel.id = "chat-panel";

const chatHeader = document.createElement('div');
chatHeader.id = "chat-header";
chatHeader.innerHTML = "<span>聊天室</span>";

const enlargeBtn = document.createElement('button');
enlargeBtn.id = "enlarge-chat";
enlargeBtn.innerHTML = "⛶";
enlargeBtn.onclick = () => {
  chatPanel.style.width = chatPanel.style.width === "600px" ? "400px" : "600px";
  chatPanel.style.height = chatPanel.style.height === "700px" ? "500px" : "700px";
};
chatHeader.appendChild(enlargeBtn);
chatPanel.appendChild(chatHeader);
chatContainer.appendChild(chatPanel);
chatContainer.appendChild(chatToggleBtn);
document.body.appendChild(chatContainer);

chatToggleBtn.addEventListener('click', () => {
  chatPanel.classList.toggle('open');
});
