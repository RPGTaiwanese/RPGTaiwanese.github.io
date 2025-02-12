/*
  Chat Room Firebase JS File

  使用說明：
  1. 放置檔案：請將此檔案（例如 chatroom.js）放入您的 Chat Room 資料夾，
     並確保該資料夾內有要使用的貼圖檔案（例如 "Texture 1 (1).png", "Texture 1 (2).png", ...）。
  2. 在 HTML 頁面中引用：
       <script type="module" src="Chat Room/chatroom.js"></script>
  3. 頁面右下角會出現浮動的「Chat」按鈕，點選後會打開聊天視窗。
  4. 如果尚未登入，聊天視窗上方會顯示「Sign in with Google」按鈕，點選後即可使用 Google 登入。
  5. 聊天視窗下方有文字輸入框與「Send」按鈕，輸入文字後即可傳送訊息。
  6. 點選「Stickers」按鈕可展開貼圖面板，直接點選貼圖圖示也可傳送貼圖訊息。
  
  貼圖規則：
  - 貼圖訊息格式必須符合： "Texture X (Y)" （例如 "Texture 1 (1)"、"Texture 2 (3)"），
    程式會自動將此文字轉換成相對應的貼圖（假設檔案名稱為 "Texture X (Y).png"）。
  
  Firebase 設定資料已內建在程式碼中，如有需要請自行調整。
*/

// ===========================================
// Firebase 相關引用與初始化
// ===========================================
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, push, onChildAdded } from "firebase/database";

// 您的 Firebase 配置
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

// ===========================================
// 建立基本的 CSS 樣式
// ===========================================
const style = document.createElement("style");
style.textContent = `
  /* 浮動按鈕 */
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
  }
`;
document.head.appendChild(style);

// ===========================================
// 建立 UI 元件
// ===========================================

// 1. 浮動的 Chat 按鈕
const chatFloatingButton = document.createElement("div");
chatFloatingButton.className = "chat-floating-button";
chatFloatingButton.innerText = "Chat";
document.body.appendChild(chatFloatingButton);

// 2. 聊天視窗（預設隱藏）
const chatWindow = document.createElement("div");
chatWindow.className = "chat-window";
chatWindow.style.display = "none";
document.body.appendChild(chatWindow);

// 2-1. 聊天視窗標題列（含標題與關閉按鈕）
const chatHeader = document.createElement("div");
chatHeader.className = "chat-header";
chatHeader.innerHTML = `<span>Chat Room</span><button id="chat-close-button">&times;</button>`;
chatWindow.appendChild(chatHeader);

// 2-2. 訊息顯示區
const chatMessages = document.createElement("div");
chatMessages.className = "chat-messages";
chatWindow.appendChild(chatMessages);

// 2-3. 驗證（登入）區塊（放在訊息區與輸入區之間）
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

// 2-4-2. 貼圖切換按鈕（放在輸入區下方，可自行調整位置）
const stickerToggleButton = document.createElement("button");
stickerToggleButton.className = "sticker-toggle";
stickerToggleButton.innerText = "Stickers";
chatWindow.appendChild(stickerToggleButton);

// 2-5. 貼圖面板（預設隱藏）
const stickerPanel = document.createElement("div");
stickerPanel.className = "sticker-panel";
chatWindow.appendChild(stickerPanel);

// 定義可用的貼圖（貼圖檔案放在同一資料夾下，請依需求調整）
const stickers = {
  "Texture 1": ["Texture 1 (1).png", "Texture 1 (2).png", "Texture 1 (3).png"],
  "Texture 2": ["Texture 2 (1).png", "Texture 2 (2).png", "Texture 2 (3).png"]
};

// 建立貼圖面板內容（依類別分組）
for (const category in stickers) {
  const categoryLabel = document.createElement("div");
  categoryLabel.style.width = "100%";
  categoryLabel.style.textAlign = "center";
  categoryLabel.style.fontWeight = "bold";
  categoryLabel.textContent = category;
  stickerPanel.appendChild(categoryLabel);

  stickers[category].forEach(stickerFile => {
    const img = document.createElement("img");
    img.src = stickerFile; // 檔案路徑預設與此 JS 同一資料夾
    img.alt = stickerFile;
    // 點選貼圖後，送出貼圖訊息（這裡訊息內容將為檔名去除副檔名，例如 "Texture 1 (1)"）
    img.addEventListener("click", () => {
      sendMessage(stickerFile.replace(".png", ""));
      stickerPanel.style.display = "none"; // 選完貼圖後隱藏面板
    });
    stickerPanel.appendChild(img);
  });
}

// ===========================================
// 事件處理
// ===========================================

// 切換聊天視窗顯示/隱藏
chatFloatingButton.addEventListener("click", () => {
  chatWindow.style.display = (chatWindow.style.display === "none") ? "flex" : "none";
});

// 關閉聊天視窗
document.getElementById("chat-close-button").addEventListener("click", () => {
  chatWindow.style.display = "none";
});

// 貼圖面板切換
stickerToggleButton.addEventListener("click", () => {
  stickerPanel.style.display = (stickerPanel.style.display === "none" || stickerPanel.style.display === "") ? "flex" : "none";
});

// 傳送訊息按鈕
sendButton.addEventListener("click", () => {
  const text = inputField.value;
  if (text.trim() !== "") {
    sendMessage(text.trim());
    inputField.value = "";
  }
});

// 監聽鍵盤 Enter 傳送訊息
inputField.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendButton.click();
  }
});

// ===========================================
// Firebase 驗證相關：檢查登入狀態
// ===========================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 已登入：啟用輸入框、傳送按鈕，並清除登入提示
    inputField.disabled = false;
    sendButton.disabled = false;
    authArea.innerHTML = "";
  } else {
    // 尚未登入：停用輸入框、傳送按鈕，並顯示登入按鈕
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

// ===========================================
// Firebase Realtime Database：送出與接收訊息
// ===========================================

// 送出訊息函數
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

// 監聽資料庫訊息新增事件
const messagesRef = ref(database, 'messages');
onChildAdded(messagesRef, (data) => {
  const message = data.val();
  displayMessage(message);
});

// 顯示訊息函數：根據訊息內容判斷是否為貼圖訊息
function displayMessage(message) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "chat-message";
  
  // 若有使用者頭像，顯示頭像
  if (message.photoURL) {
    const avatar = document.createElement("img");
    avatar.src = message.photoURL;
    avatar.alt = "Avatar";
    avatar.className = "avatar";
    messageDiv.appendChild(avatar);
  }
  
  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  
  // 檢查訊息是否符合貼圖格式
  // 貼圖格式： "Texture X"（可選擇後面加上空格及括號內數字，例如 "Texture 1 (1)"）
  const stickerPattern = /^Texture\s*\d+(?:\s*\(\d+\))?$/;
  if (stickerPattern.test(message.text)) {
    // 若符合貼圖格式，則以貼圖圖片顯示（檔案路徑為訊息文字加上 .png）
    const stickerImg = document.createElement("img");
    stickerImg.src = message.text + ".png"; // 例如 "Texture 1 (1).png"
    stickerImg.alt = message.text;
    stickerImg.style.maxWidth = "100px";
    stickerImg.style.maxHeight = "100px";
    contentDiv.appendChild(stickerImg);
  } else {
    // 否則以純文字顯示
    contentDiv.textContent = message.text;
  }
  
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  // 自動捲動到最新訊息
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
