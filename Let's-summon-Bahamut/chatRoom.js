import { getDatabase, ref, onValue, push } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 使用預設 Firebase App（假設主程式已初始化）
const db = getDatabase();

// 建立聊天室面板 DOM
const chatPanel = document.createElement("div");
chatPanel.id = "chat-panel";
chatPanel.style.position = "fixed";
chatPanel.style.left = "10px";
chatPanel.style.top = "50%";
chatPanel.style.transform = "translateY(-50%)";
chatPanel.style.width = "300px";
chatPanel.style.background = "rgba(0,0,0,0.5)";
chatPanel.style.color = "#fff";
chatPanel.style.padding = "10px";
chatPanel.style.borderRadius = "5px";
chatPanel.style.zIndex = "55";
chatPanel.style.display = "none";  // 初始隱藏
document.body.appendChild(chatPanel);

// 建立切換按鈕（按鈕文字為 "聊天室"，使用黑色透明樣式）
const toggleBtn = document.createElement("button");
toggleBtn.id = "toggle-chat-btn";
toggleBtn.textContent = "聊天室";
toggleBtn.style.width = "100%";
toggleBtn.style.padding = "5px";
toggleBtn.style.fontSize = "16px";
toggleBtn.style.marginBottom = "10px";
toggleBtn.style.background = "rgba(0,0,0,0.5)";
toggleBtn.style.color = "#fff";
toggleBtn.style.border = "none";
toggleBtn.style.cursor = "pointer";
chatPanel.appendChild(toggleBtn);

// 建立聊天室內容容器
const chatContent = document.createElement("div");
chatContent.id = "chat-content";
chatContent.style.display = "flex";
chatContent.style.flexDirection = "column";
chatPanel.appendChild(chatContent);

// 建立聊天訊息顯示區
const chatMessages = document.createElement("div");
chatMessages.id = "chat-messages";
chatMessages.style.flex = "1";
chatMessages.style.maxHeight = "300px";
chatMessages.style.overflowY = "auto";
chatMessages.style.marginBottom = "10px";
chatMessages.style.fontSize = "14px";
chatMessages.style.lineHeight = "1.4";
chatContent.appendChild(chatMessages);

// 建立聊天輸入框
const chatInput = document.createElement("input");
chatInput.id = "chat-input";
chatInput.type = "text";
chatInput.placeholder = "輸入聊天內容";
chatInput.style.width = "100%";
chatInput.style.padding = "5px";
chatInput.style.fontSize = "16px";
chatInput.style.boxSizing = "border-box";
chatContent.appendChild(chatInput);

// 切換按鈕事件：點擊時切換顯示或隱藏聊天室內容
toggleBtn.addEventListener("click", () => {
  if(chatContent.style.display === "none" || chatContent.style.display === "") {
    chatContent.style.display = "flex";
  } else {
    chatContent.style.display = "none";
  }
});

// 變數儲存目前登入使用者帳號
let currentAccount = "";

// 監聽輸入框：按下 ENTER 鍵時送出訊息
chatInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter" || e.keyCode === 13) {
    const message = chatInput.value.trim();
    if(!message) return;
    if(!currentAccount) {
      alert("請先登入");
      return;
    }
    push(ref(db, 'chatHistory'), {
      account: currentAccount,
      message: message,
      timestamp: Date.now()
    });
    chatInput.value = "";
  }
});

// 監聽 Firebase chatHistory 變動並更新聊天室訊息
onValue(ref(db, 'chatHistory'), (snapshot) => {
  const data = snapshot.val();
  chatMessages.innerHTML = "";
  if(data) {
    let messages = Object.keys(data).map(key => data[key]);
    messages.sort((a, b) => a.timestamp - b.timestamp);
    messages.forEach(msg => {
      const div = document.createElement("div");
      div.innerText = `[${msg.account}] ${msg.message}`;
      chatMessages.appendChild(div);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});

// 導出啟用聊天室的函式：設定目前使用者並顯示聊天室
export function enableChat(account) {
  currentAccount = account;
  chatPanel.style.display = "block";
}
