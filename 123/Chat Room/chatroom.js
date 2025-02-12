/*
  Chat Room Firebase JS File

  使用說明：
  1. 將此檔案（例如 chatroom.js）放在您的 Chat Room 資料夾中，
     並確保該資料夾內有要使用的貼圖檔案（例如 "Texture 1 (1).png", "Texture 1 (2).png", ...）。
  2. 在 HTML 頁面中引用此檔案（請使用 type="module"）：
       <script type="module" src="Chat Room/chatroom.js"></script>
  3. 頁面右下角會出現一個浮動的「Chat」按鈕，點選後即會開啟聊天室視窗。
  4. 若尚未登入，聊天室上方會顯示「Sign in with Google」按鈕，點選後可進行 Google 登入。
  5. 使用者登入後可傳送文字訊息，或點選「Stickers」按鈕開啟貼圖面板，直接選取貼圖傳送。
  
  貼圖規則：
  - 貼圖訊息格式必須符合 "Texture X (Y)"（例如 "Texture 1 (1)"、"Texture 2 (3)"），
    系統會以檔名加副檔名（.png）的方式尋找貼圖檔案。

  注意：請確保網頁是透過網頁伺服器（例如 Live Server）開啟，避免模組載入錯誤。
*/

// 使用 Firebase CDN 載入各個模組（請根據需要調整版本號）
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-analytics.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

// 為確保 DOM 元素已建立，將所有程式碼包在 DOMContentLoaded 事件中
document.addEventListener("DOMContentLoaded", () => {
  // -------------------------------------------
  // Firebase 初始化
  // -------------------------------------------
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
  const analytics = getAnalytics(app);
  const auth = getAuth(app);
  const database = getDatabase(app);

  // -------------------------------------------
  // 建立 CSS 樣式
  // -------------------------------------------
  const style = document.createElement("style");
  style.textContent = `
    /* 浮動的 Chat 按鈕 */
    .chat-floating-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #007bff;
      color: white;
      padding: 15px;
      border-radius: 50%;
      cursor: pointer;
      z-index: 1000;
      text-align: center;
      font-weight: bold;
      user-select: none;
    }
    /* 聊天視窗 */
    .chat-window {
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 300px;
      max-height: 400px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .chat-header {
      background: #007bff;
      color: white;
      padding: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .chat-header button {
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
    }
    .chat-messages {
      flex: 1;
      padding: 10px;
      overflow-y: auto;
      background: #f1f1f1;
    }
    .chat-input-container {
      display: flex;
      border-top: 1px solid #ccc;
    }
    .chat-input {
      flex: 1;
      padding: 10px;
      border: none;
      outline: none;
    }
    .chat-send-button {
      padding: 10px;
      border: none;
      background: #007bff;
      color: white;
      cursor: pointer;
    }
    .chat-signin {
      padding: 10px;
      text-align: center;
      border-top: 1px solid #ccc;
      background: #fff;
    }
    .chat-message {
      margin-bottom: 10px;
      display: flex;
      align-items: flex-start;
    }
    .chat-message img.avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      margin-right: 10px;
    }
    .chat-message .message-content {
      background: white;
      padding: 5px 10px;
      border-radius: 5px;
      max-width: 200px;
      word-wrap: break-word;
    }
    /* 貼圖面板 */
    .sticker-panel {
      position: absolute;
      bottom: 50px;
      right: 0;
      width: 280px;
      max-height: 200px;
      background: #fff;
      border: 1px solid #ccc;
      overflow-y: auto;
      display: none;
      flex-wrap: wrap;
      padding: 5px;
      z-index: 1001;
    }
    .sticker-panel img {
      width: 60px;
      height: 60px;
      margin: 5px;
      cursor: pointer;
    }
    .sticker-toggle {
      padding: 10px;
      border: none;
      background: #28a745;
      color: white;
      cursor: pointer;
      margin: 5px;
    }
  `;
  document.head.appendChild(style);

  // -------------------------------------------
  // 建立 UI 元件
  // -------------------------------------------
  // 1. 浮動的 Chat 按鈕
  const chatFloatingButton = document.createElement("div");
  chatFloatingButton.className = "chat-floating-button";
  chatFloatingButton.innerText = "Chat";
  document.body.appendChild(chatFloatingButton);

  // 2. 聊天視窗（初始隱藏）
  const chatWindow = document.createElement("div");
  chatWindow.className = "chat-window";
  chatWindow.style.display = "none";
  document.body.appendChild(chatWindow);

  // 2-1. 聊天視窗標題列
  const chatHeader = document.createElement("div");
  chatHeader.className = "chat-header";
  // 設定內部 HTML，並給關閉按鈕設定 id
  chatHeader.innerHTML = `<span>Chat Room</span><button id="chat-close-button">&times;</button>`;
  chatWindow.appendChild(chatHeader);

  // 2-2. 訊息顯示區
  const chatMessages = document.createElement("div");
  chatMessages.className = "chat-messages";
  chatWindow.appendChild(chatMessages);

  // 2-3. 驗證/登入區塊
  const authArea = document.createElement("div");
  authArea.className = "chat-signin";
  chatWindow.appendChild(authArea);

  // 2-4. 輸入與貼圖相關區域
  const chatInputContainer = document.createElement("div");
  chatInputContainer.className = "chat-input-container";
  chatWindow.appendChild(chatInputContainer);

  // 2-4-1. 輸入框與傳送按鈕
  const inputField = document.createElement("input");
  inputField.className = "chat-input";
  inputField.placeholder = "Type your message...";
  chatInputContainer.appendChild(inputField);

  const sendButton = document.createElement("button");
  sendButton.className = "chat-send-button";
  sendButton.innerText = "Send";
  chatInputContainer.appendChild(sendButton);

  // 2-4-2. 貼圖切換按鈕
  const stickerToggleButton = document.createElement("button");
  stickerToggleButton.className = "sticker-toggle";
  stickerToggleButton.innerText = "Stickers";
  chatWindow.appendChild(stickerToggleButton);

  // 2-5. 貼圖面板（初始隱藏）
  const stickerPanel = document.createElement("div");
  stickerPanel.className = "sticker-panel";
  chatWindow.appendChild(stickerPanel);

  // 定義可用的貼圖（貼圖檔案必須與此 JS 同一資料夾）
  const stickers = {
    "Texture 1": ["Texture 1 (1).png", "Texture 1 (2).png", "Texture 1 (3).png"],
    "Texture 2": ["Texture 2 (1).png", "Texture 2 (2).png", "Texture 2 (3).png"]
  };

  // 建立貼圖面板內容（依分類顯示）
  for (const category in stickers) {
    const categoryLabel = document.createElement("div");
    categoryLabel.style.width = "100%";
    categoryLabel.style.textAlign = "center";
    categoryLabel.style.fontWeight = "bold";
    categoryLabel.textContent = category;
    stickerPanel.appendChild(categoryLabel);

    stickers[category].forEach(stickerFile => {
      const img = document.createElement("img");
      img.src = stickerFile; // 貼圖檔案路徑預設與此 JS 同一資料夾
      img.alt = stickerFile;
      img.addEventListener("click", () => {
        sendMessage(stickerFile.replace(".png", ""));
        stickerPanel.style.display = "none"; // 選完貼圖後隱藏面板
      });
      stickerPanel.appendChild(img);
    });
  }

  // -------------------------------------------
  // 事件處理
  // -------------------------------------------
  // 切換聊天室視窗顯示/隱藏
  chatFloatingButton.addEventListener("click", () => {
    chatWindow.style.display = (chatWindow.style.display === "none") ? "flex" : "none";
  });

  // 關閉聊天室視窗
  // 此時 chatHeader 中的按鈕已存在，因此可直接綁定事件
  document.getElementById("chat-close-button").addEventListener("click", () => {
    chatWindow.style.display = "none";
  });

  // 貼圖面板切換
  stickerToggleButton.addEventListener("click", () => {
    stickerPanel.style.display = (stickerPanel.style.display === "none" || stickerPanel.style.display === "") ? "flex" : "none";
  });

  // 傳送訊息按鈕事件
  sendButton.addEventListener("click", () => {
    const text = inputField.value;
    if (text.trim() !== "") {
      sendMessage(text.trim());
      inputField.value = "";
    }
  });

  // 輸入框按 Enter 鍵傳送訊息
  inputField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendButton.click();
    }
  });

  // -------------------------------------------
  // Firebase 驗證：檢查登入狀態
  // -------------------------------------------
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // 已登入：啟用輸入框與傳送按鈕
      inputField.disabled = false;
      sendButton.disabled = false;
      authArea.innerHTML = "";
    } else {
      // 尚未登入：停用輸入框與傳送按鈕，並顯示 Google 登入按鈕
      inputField.disabled = true;
      sendButton.disabled = true;
      authArea.innerHTML = "";
      const signInButton = document.createElement("button");
      signInButton.id = "chat-signin-button";
      signInButton.innerText = "Sign in with Google";
      authArea.appendChild(signInButton);
      signInButton.addEventListener("click", () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
          .then((result) => {
            // 登入成功
          })
          .catch((error) => {
            console.error("Google Sign-In error:", error);
          });
      });
    }
  });

  // -------------------------------------------
  // Firebase Realtime Database：送出與接收訊息
  // -------------------------------------------
  function sendMessage(text) {
    const user = auth.currentUser;
    if (!user) {
      alert("Please sign in first.");
      return;
    }
    const messagesRef = ref(database, 'messages');
    push(messagesRef, {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      text: text,
      timestamp: Date.now()
    });
  }

  // 監聽訊息新增事件
  const messagesRef = ref(database, 'messages');
  onChildAdded(messagesRef, (data) => {
    const message = data.val();
    displayMessage(message);
  });

  // 根據訊息內容顯示文字或貼圖
  function displayMessage(message) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "chat-message";

    // 顯示使用者頭像（若有）
    if (message.photoURL) {
      const avatar = document.createElement("img");
      avatar.src = message.photoURL;
      avatar.alt = "Avatar";
      avatar.className = "avatar";
      messageDiv.appendChild(avatar);
    }

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";

    // 判斷是否為貼圖訊息（格式："Texture X" 或 "Texture X (Y)"）
    const stickerPattern = /^Texture\s*\d+(?:\s*\(\d+\))?$/;
    if (stickerPattern.test(message.text)) {
      const stickerImg = document.createElement("img");
      stickerImg.src = message.text + ".png"; // 例如 "Texture 1 (1).png"
      stickerImg.alt = message.text;
      stickerImg.style.maxWidth = "100px";
      stickerImg.style.maxHeight = "100px";
      contentDiv.appendChild(stickerImg);
    } else {
      contentDiv.textContent = message.text;
    }

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    // 自動捲動至最新訊息
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});
