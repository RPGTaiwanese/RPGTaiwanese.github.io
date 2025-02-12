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

// Your Firebase configuration
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
const database = getDatabase(app);

// 全域變數：用來儲存聊天室訊息區參考與是否已註冊監聽器
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
    width: 300px;
    height: 400px;
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
  #chat-header img {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    margin-right: 8px;
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
  .chat-message {
    margin-bottom: 10px;
    display: flex;
    align-items: center;
  }
  .chat-message img {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    margin-right: 5px;
  }
  .chat-message strong {
    margin-right: 5px;
  }
`;
document.head.appendChild(style);

/* ---------------------------
   2. 建立聊天室主要 HTML 元素
--------------------------- */
// 建立最外層容器
const chatContainer = document.createElement('div');
chatContainer.id = "firebase-chat-container";

// 建立浮動按鈕 (預設圖示為 💬)
const chatToggleBtn = document.createElement('div');
chatToggleBtn.id = "chat-toggle-btn";
chatToggleBtn.innerHTML = "💬";

// 建立聊天室面板 (初始隱藏)
const chatPanel = document.createElement('div');
chatPanel.id = "chat-panel";

// 將按鈕與聊天室面板加入最外層容器，並附加到網頁中
chatContainer.appendChild(chatPanel);
chatContainer.appendChild(chatToggleBtn);
document.body.appendChild(chatContainer);

// 點擊浮動按鈕時切換聊天室面板的顯示/隱藏
chatToggleBtn.addEventListener('click', () => {
  chatPanel.classList.toggle('open');
});

/* ---------------------------
   3. Firebase 驗證與登入/登出函式
--------------------------- */
function signIn() {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      // 登入成功，由 onAuthStateChanged 更新 UI
    })
    .catch((error) => {
      console.error("登入錯誤：", error);
    });
}

function signOutUser() {
  signOut(auth)
    .then(() => {
      // 登出成功，由 onAuthStateChanged 更新 UI
    })
    .catch((error) => {
      console.error("登出錯誤：", error);
    });
}

/* ---------------------------
   4. 聊天訊息處理函式
--------------------------- */
// 發送訊息：將訊息 push 到 Firebase Realtime Database
function sendMessage(user, text) {
  const messagesRef = ref(database, 'messages');
  push(messagesRef, {
    text: text,
    name: user.displayName,
    avatar: user.photoURL,
    timestamp: Date.now()
  }).catch(err => console.error(err));
}

// 將接收到的訊息新增到訊息區
function appendMessage(msg) {
  if (!messagesContainer) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = "chat-message";
  
  const avatarImg = document.createElement('img');
  avatarImg.src = msg.avatar || '';
  
  const nameSpan = document.createElement('strong');
  nameSpan.textContent = msg.name || "匿名";
  
  const textSpan = document.createElement('span');
  textSpan.textContent = ": " + msg.text;
  
  msgDiv.appendChild(avatarImg);
  msgDiv.appendChild(nameSpan);
  msgDiv.appendChild(textSpan);
  
  messagesContainer.appendChild(msgDiv);
  // 自動捲動到底部
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 監聽 Firebase Realtime Database 中的新增訊息
function loadMessages() {
  if (!messagesContainer) return;
  if (!messagesListenerAdded) {
    const messagesRef = ref(database, 'messages');
    onChildAdded(messagesRef, (snapshot) => {
      const msg = snapshot.val();
      appendMessage(msg);
    });
    messagesListenerAdded = true;
  }
}

/* ---------------------------
   5. 根據使用者狀態更新聊天室 UI
--------------------------- */
function updateChatPanel(user) {
  // 清除原有內容
  chatPanel.innerHTML = "";
  
  if (user) {
    // 使用者已登入的情況 ----------------------------
    // 建立聊天室標題列：顯示使用者大頭貼與名稱，並提供登出按鈕
    const header = document.createElement('div');
    header.id = "chat-header";
    
    const userInfo = document.createElement('div');
    userInfo.style.display = "flex";
    userInfo.style.alignItems = "center";
    
    const avatar = document.createElement('img');
    avatar.src = user.photoURL;
    avatar.alt = "User Avatar";
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = user.displayName || "使用者";
    
    userInfo.appendChild(avatar);
    userInfo.appendChild(nameSpan);
    
    const signOutBtn = document.createElement('button');
    signOutBtn.textContent = "登出";
    signOutBtn.style.background = "transparent";
    signOutBtn.style.border = "none";
    signOutBtn.style.color = "white";
    signOutBtn.style.cursor = "pointer";
    signOutBtn.addEventListener('click', signOutUser);
    
    header.appendChild(userInfo);
    header.appendChild(signOutBtn);
    
    chatPanel.appendChild(header);
    
    // 建立訊息顯示區
    messagesContainer = document.createElement('div');
    messagesContainer.id = "chat-messages";
    chatPanel.appendChild(messagesContainer);
    
    // 建立訊息輸入區
    const inputContainer = document.createElement('div');
    inputContainer.id = "chat-input";
    
    const inputField = document.createElement('input');
    inputField.type = "text";
    inputField.placeholder = "輸入訊息...";
    
    const sendButton = document.createElement('button');
    sendButton.textContent = "送出";
    sendButton.addEventListener('click', () => {
      const text = inputField.value.trim();
      if (text !== "") {
        sendMessage(user, text);
        inputField.value = "";
      }
    });
    
    inputContainer.appendChild(inputField);
    inputContainer.appendChild(sendButton);
    chatPanel.appendChild(inputContainer);
    
    // 開始載入並監聽訊息
    loadMessages();
    
  } else {
    // 使用者未登入的情況 ----------------------------
    // 顯示提示文字與 Google 登入按鈕
    const signInContainer = document.createElement('div');
    signInContainer.style.padding = "20px";
    signInContainer.style.textAlign = "center";
    
    const info = document.createElement('p');
    info.textContent = "請使用 Google 登入以進入聊天室";
    
    const signInBtn = document.createElement('button');
    signInBtn.textContent = "Google 登入";
    signInBtn.style.padding = "10px 20px";
    signInBtn.style.background = "#4285F4";
    signInBtn.style.color = "white";
    signInBtn.style.border = "none";
    signInBtn.style.borderRadius = "4px";
    signInBtn.style.cursor = "pointer";
    signInBtn.addEventListener('click', signIn);
    
    signInContainer.appendChild(info);
    signInContainer.appendChild(signInBtn);
    chatPanel.appendChild(signInContainer);
  }
}

// 監聽 Firebase 驗證狀態變化 (登入/登出)
onAuthStateChanged(auth, (user) => {
  updateChatPanel(user);
});
