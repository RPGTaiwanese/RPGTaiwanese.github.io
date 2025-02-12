/**
 * Firebase Chat Room Module
 * 
 * 功能說明：
 * - 在網頁右下角出現一個浮動的聊天按鈕 (💬)。
 * - 點擊按鈕後會展開聊天室視窗（浮動式）。
 * - 若使用者已使用 Google 登入，聊天室會顯示使用者的 Google 大頭貼，
 *   並顯示聊天室內容與輸入區，可即時發送/接收訊息（使用 Firebase Realtime Database）。
 *   登入後，聊天室標題列可拖曳，讓整個聊天室在頁面上浮動移動。
 * - 若使用者尚未登入，聊天室畫面會顯示「Google 登入」按鈕，點擊後可使用 Google 帳號登入。
 *
 * 使用說明：
 * 1. 請將此檔案存放於您的 "Chat Room" 資料夾中 (例如檔名為 chat-room.js)。
 * 2. 在網頁中引入此 JS 檔，範例如下：
 *
 *    <script type="module" src="Chat Room/chat-room.js"></script>
 *
 * 3. 請確認您已於 Firebase 主控台啟用 Google 驗證，並正確設定 Realtime Database。
 * 4. 若需要修改樣式或拖曳行為，可自行調整下方程式碼中的 CSS 及 JavaScript 部分。
 *
 * Firebase 專案設定如下：
 */
 
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { getDatabase, ref, push, onChildAdded } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDt9mJRH-BHlEksl4xla32sVIUGVnLUxWY",
  authDomain: "future-infusion-368721.firebaseapp.com",
  databaseURL: "https://future-infusion-368721-default-rtdb.firebaseio.com",
  projectId: "future-infusion-368721",
  storageBucket: "future-infusion-368721.firebasestorage.app",
  messagingSenderId: "345445420847",
  appId: "1:345445420847:web:070778c173ec6157c6dbda"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// 建立聊天室容器 (初始為右下角小視窗)
const chatContainer = document.createElement('div');
chatContainer.id = "firebase-chat-container";
chatContainer.style.position = "fixed";
chatContainer.style.bottom = "20px";
chatContainer.style.right = "20px";
chatContainer.style.width = "300px";
chatContainer.style.height = "400px";
// 將背景改為黑色半透明
chatContainer.style.background = "rgba(0, 0, 0, 0.8)";
chatContainer.style.border = "1px solid #ccc";
chatContainer.style.borderRadius = "5px";
chatContainer.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
chatContainer.style.display = "flex";
chatContainer.style.flexDirection = "column";
document.body.appendChild(chatContainer);

// 聊天室標題列 (header)
const chatHeader = document.createElement('div');
chatHeader.style.background = "transparent";
chatHeader.style.color = "white";
chatHeader.style.padding = "10px";
chatHeader.style.textAlign = "center";
chatHeader.style.position = "relative";
chatHeader.textContent = "聊天室";

// 新增「放大」按鈕，放於標題列右上角
const enlargeButton = document.createElement('button');
enlargeButton.textContent = "放大";
enlargeButton.style.position = "absolute";
enlargeButton.style.right = "10px";
enlargeButton.style.top = "10px";
enlargeButton.style.background = "transparent";
enlargeButton.style.border = "none";
enlargeButton.style.color = "white";
enlargeButton.style.fontSize = "14px";
enlargeButton.style.cursor = "pointer";
chatHeader.appendChild(enlargeButton);

chatContainer.appendChild(chatHeader);

// 聊天訊息區
const chatMessages = document.createElement('div');
chatMessages.style.flex = "1";
chatMessages.style.overflowY = "auto";
chatMessages.style.padding = "10px";
// 調整訊息區背景色 (黑色半透明)
chatMessages.style.background = "rgba(0, 0, 0, 0.6)";
chatMessages.style.color = "white";
chatContainer.appendChild(chatMessages);

// 聊天輸入與送出區
const chatInputContainer = document.createElement('div');
chatInputContainer.style.display = "flex";
chatInputContainer.style.borderTop = "1px solid #ccc";

const chatInput = document.createElement('input');
chatInput.type = "text";
chatInput.style.flex = "1";
chatInput.style.padding = "10px";
// 調整輸入框背景與文字顏色
chatInput.style.background = "#333";
chatInput.style.color = "white";
chatInput.style.border = "none";

const sendButton = document.createElement('button');
sendButton.textContent = "發送";
sendButton.style.padding = "10px";
sendButton.style.background = "#007bff";
sendButton.style.color = "white";
sendButton.style.border = "none";
sendButton.style.cursor = "pointer";

chatInputContainer.appendChild(chatInput);
chatInputContainer.appendChild(sendButton);
chatContainer.appendChild(chatInputContainer);

// 放大/關閉 切換邏輯
let isEnlarged = false;
enlargeButton.addEventListener('click', () => {
  if (!isEnlarged) {
    // 放大並移至中央：改變尺寸並利用 top/left/transform 置中
    chatContainer.style.width = "500px";
    chatContainer.style.height = "600px";
    chatContainer.style.top = "50%";
    chatContainer.style.left = "50%";
    chatContainer.style.transform = "translate(-50%, -50%)";
    // 清除原本的右下定位
    chatContainer.style.bottom = "";
    chatContainer.style.right = "";
    enlargeButton.textContent = "關閉";
  } else {
    // 恢復原狀：尺寸縮回，定位回右下角
    chatContainer.style.width = "300px";
    chatContainer.style.height = "400px";
    chatContainer.style.bottom = "20px";
    chatContainer.style.right = "20px";
    // 清除中央定位的設定
    chatContainer.style.top = "";
    chatContainer.style.left = "";
    chatContainer.style.transform = "";
    enlargeButton.textContent = "放大";
  }
  isEnlarged = !isEnlarged;
});

function sendMessage(user, text) {
  const messagesRef = ref(database, 'messages');
  push(messagesRef, {
    text: text,
    name: user.displayName,
    avatar: user.photoURL,
    timestamp: Date.now()
  });
}

function appendMessage(msg) {
  const msgDiv = document.createElement('div');
  msgDiv.style.marginBottom = "10px";
  msgDiv.style.color = "white";
  
  const avatarImg = document.createElement('img');
  avatarImg.src = msg.avatar || '';
  avatarImg.style.width = "20px";
  avatarImg.style.height = "20px";
  avatarImg.style.borderRadius = "50%";
  avatarImg.style.marginRight = "5px";
  
  const nameSpan = document.createElement('strong');
  nameSpan.textContent = msg.name || "匿名";
  
  const textSpan = document.createElement('span');
  textSpan.textContent = ": " + msg.text;
  
  msgDiv.appendChild(avatarImg);
  msgDiv.appendChild(nameSpan);
  msgDiv.appendChild(textSpan);
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

onAuthStateChanged(auth, (user) => {
  chatMessages.innerHTML = "";
  if (user) {
    loadMessages();
    sendButton.onclick = () => {
      if (chatInput.value.trim() !== "") {
        sendMessage(user, chatInput.value);
        chatInput.value = "";
      }
    };
  } else {
    const loginButton = document.createElement('button');
    loginButton.textContent = "使用 Google 登入";
    loginButton.style.padding = "10px";
    loginButton.style.background = "#007bff";
    loginButton.style.color = "white";
    loginButton.style.border = "none";
    loginButton.style.cursor = "pointer";
    loginButton.onclick = () => {
      const provider = new GoogleAuthProvider();
      signInWithPopup(auth, provider).catch(console.error);
    };
    chatMessages.appendChild(loginButton);
  }
});

function loadMessages() {
  const messagesRef = ref(database, 'messages');
  onChildAdded(messagesRef, (snapshot) => {
    const msg = snapshot.val();
    appendMessage(msg);
  });
}
