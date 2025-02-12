/*
 * Chat Room Firebase JS 文件
 * 版本：1.0
 *
 * 說明：
 * 1. 此檔案需置於 Chat Room 資料夾中，例如：Chat Room/chatroom.js
 * 2. 功能：在網頁上產生一個浮動的聊天室 UI，
 *    - 點擊浮動按鈕後會展開聊天室介面。
 *    - 若使用者尚未登入，則聊天室內會顯示「使用 Google 登入」按鈕。
 *    - 使用者使用 Google 登入後，將會顯示該使用者的 Google 大頭貼，
 *      並可在聊天室內發送訊息（訊息會顯示使用者大頭貼與名稱）。
 *    - 聊天室內有一個「放大」按鈕，可調整聊天室的顯示尺寸。
 *
 * 使用說明：
 * 1. 將此檔案放置在 Chat Room 資料夾中。
 * 2. 在您的網頁中加入以下代碼（請以 type="module" 引入）：
 *      <script type="module" src="Chat Room/chatroom.js"></script>
 *
 * 注意：請確認網頁環境支援 ES Modules。此檔案會自動初始化 Firebase，
 *       並使用下列 Firebase 設定進行連線。
 */

// Firebase SDK 模組引入
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, push, onChildAdded } from "firebase/database";

// 您的 Firebase 配置資料（請依照您的設定填寫）
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

// 初始化 Firebase 服務
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

// 建立聊天室 UI
function createChatUI() {
  // 新增樣式
  const style = document.createElement('style');
  style.innerHTML = `
    /* 浮動按鈕樣式 */
    #chat-float-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #007bff;
      color: white;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 1000;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      font-size: 24px;
    }
    /* 聊天室容器 */
    #chat-container {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 300px;
      height: 400px;
      background-color: #fff;
      border: 1px solid #ccc;
      border-radius: 8px;
      display: none;
      flex-direction: column;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    }
    /* 聊天室標題列 */
    #chat-header {
      background-color: #007bff;
      color: #fff;
      padding: 10px;
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    /* 訊息顯示區 */
    #chat-messages {
      flex: 1;
      padding: 10px;
      overflow-y: auto;
      background: #f1f1f1;
    }
    /* 輸入區 */
    #chat-input-area {
      display: flex;
      padding: 10px;
      border-top: 1px solid #ccc;
    }
    #chat-input {
      flex: 1;
      padding: 5px;
    }
    #chat-send-btn, #chat-enlarge-btn {
      margin-left: 5px;
    }
    /* 放大聊天室的樣式 */
    #chat-container.enlarged {
      width: 500px;
      height: 600px;
    }
  `;
  document.head.appendChild(style);

  // 建立浮動聊天室按鈕
  const chatFloatBtn = document.createElement('div');
  chatFloatBtn.id = 'chat-float-btn';
  chatFloatBtn.innerHTML = '&#9993;'; // 信封圖示
  document.body.appendChild(chatFloatBtn);

  // 建立聊天室容器
  const chatContainer = document.createElement('div');
  chatContainer.id = 'chat-container';
  chatContainer.innerHTML = `
    <div id="chat-header">
      <span>聊天室</span>
      <div>
        <button id="chat-enlarge-btn">放大</button>
      </div>
    </div>
    <div id="chat-body">
      <div id="chat-messages"></div>
      <div id="chat-login" style="padding:10px; text-align: center; display: none;">
        <button id="google-login-btn">使用 Google 登入</button>
      </div>
      <div id="chat-input-area" style="display: none;">
        <input type="text" id="chat-input" placeholder="輸入訊息..."/>
        <button id="chat-send-btn">發送</button>
      </div>
    </div>
  `;
  document.body.appendChild(chatContainer);

  // 點擊浮動按鈕顯示/隱藏聊天室
  chatFloatBtn.addEventListener('click', () => {
    if (chatContainer.style.display === 'none' || chatContainer.style.display === '') {
      chatContainer.style.display = 'flex';
    } else {
      chatContainer.style.display = 'none';
    }
  });

  // 放大聊天室按鈕
  const enlargeBtn = document.getElementById('chat-enlarge-btn');
  enlargeBtn.addEventListener('click', () => {
    chatContainer.classList.toggle('enlarged');
  });

  // Google 登入按鈕
  const googleLoginBtn = document.getElementById('google-login-btn');
  googleLoginBtn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        // 登入成功
      })
      .catch((error) => {
        console.error("登入失敗:", error);
      });
  });

  // 監聽使用者認證狀態變化
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // 使用者已登入：隱藏登入區塊，顯示輸入區
      document.getElementById('chat-login').style.display = 'none';
      document.getElementById('chat-input-area').style.display = 'flex';
      // 若尚未在標題列顯示大頭貼則新增
      let avatarImg = document.getElementById('user-avatar');
      if (!avatarImg) {
        avatarImg = document.createElement('img');
        avatarImg.id = 'user-avatar';
        avatarImg.style.width = '30px';
        avatarImg.style.height = '30px';
        avatarImg.style.borderRadius = '50%';
        avatarImg.style.marginRight = '10px';
        const header = document.getElementById('chat-header');
        header.insertBefore(avatarImg, header.firstChild);
      }
      avatarImg.src = user.photoURL;

      // 開始載入聊天室訊息
      loadMessages();
    } else {
      // 尚未登入：顯示 Google 登入區塊，隱藏輸入區
      document.getElementById('chat-login').style.display = 'block';
      document.getElementById('chat-input-area').style.display = 'none';
    }
  });

  // 註冊發送訊息事件
  const sendBtn = document.getElementById('chat-send-btn');
  sendBtn.addEventListener('click', sendMessage);
  // 按下 Enter 鍵也可發送訊息
  const chatInput = document.getElementById('chat-input');
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
}

// 讀取 Firebase Realtime Database 中的訊息
function loadMessages() {
  const messagesRef = ref(database, 'messages');
  const messagesDiv = document.getElementById('chat-messages');
  messagesDiv.innerHTML = ''; // 清空訊息區
  onChildAdded(messagesRef, (data) => {
    const message = data.val();
    displayMessage(message);
  });
}

// 將一筆訊息顯示於聊天室內
function displayMessage(message) {
  const messagesDiv = document.getElementById('chat-messages');
  const msgDiv = document.createElement('div');
  msgDiv.style.marginBottom = '10px';
  msgDiv.style.display = 'flex';
  msgDiv.style.alignItems = 'center';

  const avatar = document.createElement('img');
  avatar.src = message.photoURL || 'https://www.gravatar.com/avatar/?d=mp';
  avatar.style.width = '30px';
  avatar.style.height = '30px';
  avatar.style.borderRadius = '50%';
  avatar.style.marginRight = '10px';

  const textDiv = document.createElement('div');
  textDiv.innerHTML = `<strong>${message.displayName || '匿名'}</strong>: ${message.text}`;

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(textDiv);
  messagesDiv.appendChild(msgDiv);
  // 自動捲動至最底部
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// 發送訊息至 Firebase
function sendMessage() {
  const user = auth.currentUser;
  if (!user) return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (text === '') return;
  const message = {
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL,
    text: text,
    timestamp: Date.now()
  };
  push(ref(database, 'messages'), message)
    .then(() => {
      input.value = '';
    })
    .catch((error) => {
      console.error("發送訊息失敗:", error);
    });
}

// 當網頁內容載入完成後初始化聊天室 UI
document.addEventListener('DOMContentLoaded', () => {
  createChatUI();
});
