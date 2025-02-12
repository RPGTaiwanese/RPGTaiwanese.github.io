/**
 * Firebase Chat Room Module - 全新版本：小聊天室 / 大聊天室切換
 * 
 * 功能說明：
 * - 初始顯示為浮動的小聊天室，位於網頁右下角。
 * - 使用者登入後，聊天室標題列中會出現「大聊天室」按鈕。
 * - 按下「大聊天室」按鈕後，原本的小聊天室會隱藏，
 *   並在網頁正中央顯示一個較大的聊天室（全螢幕模式）。
 * - 在大聊天室中有「關閉全螢幕」按鈕，點擊後關閉大聊天室，
 *   恢復小聊天室的顯示。
 * - 兩種模式皆可即時聊天，並透過 Firebase Realtime Database 進行資料同步。
 *
 * 使用說明：
 * 1. 請將此檔案存放於您的 "Chat Room" 資料夾中 (例如檔名為 chat-room.js)。
 * 2. 在網頁中引入此 JS 檔，範例如下：
 *
 *      <script type="module" src="Chat Room/chat-room.js"></script>
 *
 * 3. 請確認您已於 Firebase 主控台啟用 Google 驗證，並正確設定 Realtime Database。
 * 4. 如有需要，可自行調整 CSS 與 UI 設定。
 *
 * Firebase 專案設定如下：
 */

// 1. Firebase SDK 模組匯入
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

// ------------------------------
// 全域變數設定
// ------------------------------

// 儲存所有接收到的訊息（共用資料）
let allMessages = [];
// 是否已註冊訊息監聽器（只註冊一次）
let messagesListenerAdded = false;
// 記錄目前「可更新訊息區」的 DOM 參考（小聊天室或大聊天室皆用此變數）
let activeMessagesContainer = null;

// ------------------------------
// 2. 建立共用 CSS 樣式
// ------------------------------
const style = document.createElement('style');
style.textContent = `
  /* 共用字型 */
  .chat-container * {
    font-family: Arial, sans-serif;
  }
  /* 小聊天室容器 */
  #small-chat-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 300px;
    height: 400px;
    z-index: 9999;
    border: 1px solid #ccc;
    border-radius: 5px;
    background: white;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    overflow: hidden;
  }
  /* 大聊天室容器 */
  #big-chat-container {
    position: fixed;
    top: 50%;
    left: 50%;
    width: 600px;
    height: 600px;
    transform: translate(-50%, -50%);
    z-index: 10000;
    border: 1px solid #ccc;
    border-radius: 5px;
    background: white;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    overflow: hidden;
  }
  /* 聊天室 header */
  .chat-header {
    background: #007bff;
    color: white;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
  }
  .chat-header img {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    margin-right: 8px;
  }
  .chat-header button {
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    margin-left: 5px;
  }
  /* 訊息顯示區 */
  .chat-messages {
    height: calc(100% - 100px);
    overflow-y: auto;
    padding: 10px;
    background: #f9f9f9;
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
  /* 訊息輸入區 */
  .chat-input {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    display: flex;
    border-top: 1px solid #ccc;
  }
  .chat-input input {
    flex: 1;
    border: none;
    padding: 10px;
    outline: none;
  }
  .chat-input button {
    border: none;
    padding: 10px;
    background: #007bff;
    color: white;
    cursor: pointer;
  }
`;
document.head.appendChild(style);

// ------------------------------
// 3. 建立小聊天室與大聊天室的容器（皆附加於網頁）
// ------------------------------
const smallChatContainer = document.createElement('div');
smallChatContainer.id = "small-chat-container";
smallChatContainer.classList.add("chat-container");
document.body.appendChild(smallChatContainer);

const bigChatContainer = document.createElement('div');
bigChatContainer.id = "big-chat-container";
bigChatContainer.classList.add("chat-container");
// 預設隱藏大聊天室
bigChatContainer.style.display = "none";
document.body.appendChild(bigChatContainer);

// ------------------------------
// 4. Firebase 驗證與登入/登出函式
// ------------------------------
function signIn() {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      // 登入成功，onAuthStateChanged 會自動更新 UI
    })
    .catch((error) => {
      console.error("登入錯誤：", error);
    });
}

function signOutUser() {
  signOut(auth)
    .then(() => {
      // 登出成功，onAuthStateChanged 會自動更新 UI
    })
    .catch((error) => {
      console.error("登出錯誤：", error);
    });
}

// ------------------------------
// 5. 訊息處理相關函式
// ------------------------------

// 將訊息 push 到 Firebase Realtime Database
function sendMessage(user, text) {
  const messagesRef = ref(database, 'messages');
  push(messagesRef, {
    text: text,
    name: user.displayName,
    avatar: user.photoURL,
    timestamp: Date.now()
  }).catch(err => console.error(err));
}

// 將單一訊息新增到指定 container
function appendMessageToContainer(msg, container) {
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
  
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

// 重新渲染所有訊息到 container（用於模式切換時）
function renderAllMessages(container) {
  container.innerHTML = "";
  for (const msg of allMessages) {
    appendMessageToContainer(msg, container);
  }
}

// 只註冊一次：監聽 Firebase Realtime Database 中新增的訊息
function loadMessages() {
  if (!messagesListenerAdded) {
    const messagesRef = ref(database, 'messages');
    onChildAdded(messagesRef, (snapshot) => {
      const msg = snapshot.val();
      allMessages.push(msg);
      // 若目前有顯示中的訊息容器，則直接新增
      if (activeMessagesContainer) {
        appendMessageToContainer(msg, activeMessagesContainer);
      }
    });
    messagesListenerAdded = true;
  }
}

// ------------------------------
// 6. 建立登入前的 UI（使用者尚未登入時）
// ------------------------------
function updateChatUIForSignIn(container) {
  container.innerHTML = "";
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
  container.appendChild(signInContainer);
}

// ------------------------------
// 7. 建立聊天室 UI（共用函式）
// mode: "small" 或 "big"
function updateChatUI(user, container, mode) {
  container.innerHTML = "";
  
  // 建立 header
  const header = document.createElement('div');
  header.className = "chat-header";
  
  // 使用者資訊
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
  
  // 控制按鈕區
  const controls = document.createElement('div');
  
  // 登出按鈕
  const signOutBtn = document.createElement('button');
  signOutBtn.textContent = "登出";
  signOutBtn.addEventListener('click', signOutUser);
  controls.appendChild(signOutBtn);
  
  if (mode === "small") {
    // 小聊天室模式：顯示切換到大聊天室的按鈕
    const openBigChatBtn = document.createElement('button');
    openBigChatBtn.textContent = "大聊天室";
    openBigChatBtn.addEventListener('click', () => {
      openBigChat(user);
    });
    controls.appendChild(openBigChatBtn);
  } else if (mode === "big") {
    // 大聊天室模式：顯示關閉全螢幕的按鈕
    const closeBigChatBtn = document.createElement('button');
    closeBigChatBtn.textContent = "關閉全螢幕";
    closeBigChatBtn.addEventListener('click', () => {
      closeBigChat(user);
    });
    controls.appendChild(closeBigChatBtn);
  }
  
  header.appendChild(userInfo);
  header.appendChild(controls);
  container.appendChild(header);
  
  // 建立訊息顯示區
  const messagesContainer = document.createElement('div');
  messagesContainer.className = "chat-messages";
  container.appendChild(messagesContainer);
  
  // 建立輸入區
  const inputContainer = document.createElement('div');
  inputContainer.className = "chat-input";
  
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
  container.appendChild(inputContainer);
  
  // 設定全域「可更新訊息區」為此模式的訊息容器，並重繪所有訊息
  activeMessagesContainer = messagesContainer;
  renderAllMessages(activeMessagesContainer);
  
  // 啟動訊息監聽（只註冊一次）
  loadMessages();
}

// ------------------------------
// 8. 模式切換函式：打開／關閉大聊天室
// ------------------------------
function openBigChat(user) {
  // 隱藏小聊天室，顯示大聊天室
  smallChatContainer.style.display = "none";
  bigChatContainer.style.display = "block";
  updateChatUI(user, bigChatContainer, "big");
}

function closeBigChat(user) {
  // 隱藏大聊天室，顯示小聊天室
  bigChatContainer.style.display = "none";
  smallChatContainer.style.display = "block";
  updateChatUI(user, smallChatContainer, "small");
}

// ------------------------------
// 9. 監聽 Firebase 驗證狀態變化，依據使用者狀態更新 UI
// ------------------------------
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 使用者已登入，更新小聊天室 UI（預設顯示小聊天室）
    smallChatContainer.style.display = "block";
    updateChatUI(user, smallChatContainer, "small");
    // 隱藏大聊天室（避免切換前殘留）
    bigChatContainer.style.display = "none";
  } else {
    // 未登入狀態，僅於小聊天室中顯示登入 UI
    updateChatUIForSignIn(smallChatContainer);
    // 隱藏大聊天室
    bigChatContainer.style.display = "none";
  }
});
