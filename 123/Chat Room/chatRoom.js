/************************************************************************************
 * Firebase Chat Room JS 檔案
 *
 * 【使用說明】
 * 1. 請將此檔案放置在 Chat Room 資料夾中。
 * 2. 在 HTML 頁面中引用此檔案（必須使用 type="module"）：
 *      <script type="module" src="Chat Room/chatRoom.js"></script>
 * 3. 請確認 Chat Room 資料夾中有貼圖檔案，例如：
 *      - Texture 1.png
 *      - Texture 1 (1).png
 *      - Texture 1 (2).png
 *      - Texture 2.png
 *      - Texture 2 (1).png
 *    符合 "Texture 1" 與 "Texture 2" 命名規則的檔案會被視為可用的貼圖，
 *    並在聊天室中支援點選後發送貼圖訊息。
 * 4. 若使用者未登入，畫面上會顯示 Google 登入按鈕；登入後則顯示聊天室介面，
 *    並以 Firebase Realtime Database 儲存及即時接收訊息。
 *
 * 【Firebase 設定資料】  
 * （請勿更動以下設定，除非你有自己的 Firebase 專案資料）
 ************************************************************************************/

// Firebase SDK 引入
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { getDatabase, ref, push, onChildAdded } from "firebase/database";

// Firebase 專案設定（請依照你的專案資料修改）
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
const provider = new GoogleAuthProvider();

// 建立一個主容器，後續所有 UI 都會加入此容器
const container = document.createElement('div');
container.id = "chatroom-container";
container.style.fontFamily = "Arial, sans-serif";
document.body.appendChild(container);

// 建立兩個區塊：未登入的登入區 (loginDiv) 與已登入的聊天室區 (chatDiv)
const loginDiv = document.createElement('div');
loginDiv.id = "login-div";
loginDiv.style.textAlign = "center";
loginDiv.style.marginTop = "50px";

const chatDiv = document.createElement('div');
chatDiv.id = "chat-div";
chatDiv.style.display = "none";  // 初始隱藏，待登入後顯示

container.appendChild(loginDiv);
container.appendChild(chatDiv);

// ─── 未登入時的 UI ───────────────────────────────────────────────
function renderLoginUI() {
  loginDiv.innerHTML = "";
  const title = document.createElement('h2');
  title.textContent = "歡迎使用聊天室";
  loginDiv.appendChild(title);

  const signInButton = document.createElement('button');
  signInButton.textContent = "使用 Google 登入";
  signInButton.style.padding = "10px 20px";
  signInButton.style.fontSize = "16px";
  signInButton.onclick = () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        // 登入成功後 onAuthStateChanged 會自動切換畫面
      })
      .catch((error) => {
        console.error("登入錯誤:", error);
        alert("登入發生錯誤，請稍後再試。");
      });
  };
  loginDiv.appendChild(signInButton);
}

// ─── 登入後的聊天室 UI ───────────────────────────────────────────
function renderChatUI(user) {
  chatDiv.innerHTML = ""; // 清空先前內容

  // 標題列：顯示使用者資訊與登出按鈕
  const header = document.createElement('div');
  header.id = "chat-header";
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.padding = "10px";
  header.style.backgroundColor = "#f0f0f0";

  // 使用者資訊（大頭貼 + 顯示名稱）
  const userInfo = document.createElement('div');
  userInfo.style.display = "flex";
  userInfo.style.alignItems = "center";
  const avatar = document.createElement('img');
  avatar.src = user.photoURL;
  avatar.alt = "User Avatar";
  avatar.style.width = "40px";
  avatar.style.height = "40px";
  avatar.style.borderRadius = "50%";
  avatar.style.marginRight = "10px";
  const nameSpan = document.createElement('span');
  nameSpan.textContent = user.displayName;
  userInfo.appendChild(avatar);
  userInfo.appendChild(nameSpan);

  // 登出按鈕
  const signOutButton = document.createElement('button');
  signOutButton.textContent = "登出";
  signOutButton.style.padding = "5px 10px";
  signOutButton.onclick = () => {
    signOut(auth)
      .then(() => {
        // 登出後 onAuthStateChanged 會自動切換畫面
      })
      .catch((error) => {
        console.error("登出錯誤:", error);
        alert("登出時發生錯誤。");
      });
  };

  header.appendChild(userInfo);
  header.appendChild(signOutButton);
  chatDiv.appendChild(header);

  // 訊息顯示區
  const messagesContainer = document.createElement('div');
  messagesContainer.id = "messages-container";
  messagesContainer.style.height = "300px";
  messagesContainer.style.overflowY = "auto";
  messagesContainer.style.border = "1px solid #ccc";
  messagesContainer.style.padding = "10px";
  messagesContainer.style.margin = "10px";
  chatDiv.appendChild(messagesContainer);

  // 輸入區：文字輸入、發送按鈕、貼圖開關
  const inputContainer = document.createElement('div');
  inputContainer.id = "input-container";
  inputContainer.style.display = "flex";
  inputContainer.style.alignItems = "center";
  inputContainer.style.margin = "10px";

  const messageInput = document.createElement('input');
  messageInput.type = "text";
  messageInput.placeholder = "輸入訊息...";
  messageInput.style.flex = "1";
  messageInput.style.padding = "8px";
  messageInput.style.fontSize = "16px";

  const sendButton = document.createElement('button');
  sendButton.textContent = "發送";
  sendButton.style.padding = "8px 12px";
  sendButton.style.marginLeft = "5px";
  sendButton.onclick = () => {
    if (messageInput.value.trim() !== "") {
      sendMessage("text", messageInput.value.trim());
      messageInput.value = "";
    }
  };

  // 支援 Enter 鍵發送訊息
  messageInput.addEventListener("keyup", function (e) {
    if (e.key === "Enter") {
      sendButton.click();
    }
  });

  const stickerToggleButton = document.createElement('button');
  stickerToggleButton.textContent = "貼圖";
  stickerToggleButton.style.padding = "8px 12px";
  stickerToggleButton.style.marginLeft = "5px";
  stickerToggleButton.onclick = () => {
    // 切換貼圖面板顯示狀態
    if (stickerPanel.style.display === "none" || stickerPanel.style.display === "") {
      stickerPanel.style.display = "block";
    } else {
      stickerPanel.style.display = "none";
    }
  };

  inputContainer.appendChild(messageInput);
  inputContainer.appendChild(sendButton);
  inputContainer.appendChild(stickerToggleButton);
  chatDiv.appendChild(inputContainer);

  // 貼圖面板（初始隱藏）
  const stickerPanel = document.createElement('div');
  stickerPanel.id = "sticker-panel";
  stickerPanel.style.display = "none";
  stickerPanel.style.border = "1px solid #ccc";
  stickerPanel.style.padding = "5px";
  stickerPanel.style.margin = "10px";
  stickerPanel.style.maxHeight = "150px";
  stickerPanel.style.overflowY = "auto";
  chatDiv.appendChild(stickerPanel);

  // 載入貼圖：請根據需要調整此陣列，貼圖檔案必須放在同一資料夾中或路徑正確
  loadStickers(stickerPanel);

  // 監聽 Firebase Realtime Database 中 "messages" 資料節點，顯示所有新加入的訊息
  const messagesRef = ref(database, 'messages');
  onChildAdded(messagesRef, (data) => {
    const msg = data.val();
    addMessageToUI(msg, messagesContainer);
  });
}

// ─── 發送訊息 (type 可為 "text" 或 "sticker") ─────────────────────────────
function sendMessage(type, content) {
  if (!auth.currentUser) return;
  const messagesRef = ref(database, 'messages');
  push(messagesRef, {
    uid: auth.currentUser.uid,
    displayName: auth.currentUser.displayName,
    photoURL: auth.currentUser.photoURL,
    type: type,       // "text" 或 "sticker"
    content: content, // 文字內容或貼圖檔案名稱（例如 "Texture 1.png"）
    timestamp: Date.now()
  });
}

// ─── 將訊息加入畫面顯示 ───────────────────────────────────────────────
function addMessageToUI(message, container) {
  const messageDiv = document.createElement('div');
  messageDiv.style.marginBottom = "10px";
  messageDiv.style.display = "flex";
  messageDiv.style.alignItems = "center";

  // 使用者大頭貼
  const avatar = document.createElement('img');
  avatar.src = message.photoURL;
  avatar.alt = "Avatar";
  avatar.style.width = "30px";
  avatar.style.height = "30px";
  avatar.style.borderRadius = "50%";
  avatar.style.marginRight = "10px";
  messageDiv.appendChild(avatar);

  // 訊息內容
  const contentDiv = document.createElement('div');
  if (message.type === "sticker") {
    // 若是貼圖訊息，顯示貼圖圖片
    const img = document.createElement('img');
    // 此處預設貼圖檔案與此 JS 檔案位於相同資料夾
    img.src = message.content;
    img.alt = message.content;
    img.style.maxWidth = "100px";
    img.style.maxHeight = "100px";
    contentDiv.appendChild(img);
  } else {
    // 文字訊息：顯示「使用者名稱: 訊息內容」
    contentDiv.textContent = message.displayName + ": " + message.content;
  }
  messageDiv.appendChild(contentDiv);

  container.appendChild(messageDiv);
  // 自動捲動至最新訊息
  container.scrollTop = container.scrollHeight;
}

// ─── 載入貼圖面板 ──────────────────────────────────────────────────────
function loadStickers(panel) {
  // 貼圖檔案陣列 (可依需要新增或修改貼圖檔名)
  const stickerFiles = [
    "Texture 1.png",
    "Texture 1 (1).png",
    "Texture 1 (2).png",
    "Texture 2.png",
    "Texture 2 (1).png"
    // 若有更多貼圖，請依照此格式新增
  ];

  // 依序為每個貼圖檔案建立一個 img 元素
  stickerFiles.forEach(filename => {
    const stickerImg = document.createElement('img');
    stickerImg.src = filename; // 相對路徑，請確保貼圖檔案位置正確
    stickerImg.alt = filename;
    stickerImg.style.width = "50px";
    stickerImg.style.height = "50px";
    stickerImg.style.margin = "5px";
    stickerImg.style.cursor = "pointer";
    stickerImg.onclick = () => {
      // 點選貼圖後，將貼圖檔案名稱作為訊息內容發送
      sendMessage("sticker", filename);
    };
    panel.appendChild(stickerImg);
  });
}

// ─── 監聽使用者登入狀態變化 ─────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 使用者已登入：隱藏登入區，顯示聊天室
    loginDiv.style.display = "none";
    chatDiv.style.display = "block";
    renderChatUI(user);
  } else {
    // 尚未登入：隱藏聊天室區，顯示登入畫面
    chatDiv.style.display = "none";
    loginDiv.style.display = "block";
    renderLoginUI();
  }
});
