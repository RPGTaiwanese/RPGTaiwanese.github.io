import { ref, onValue, push } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

export default function initChat(db, currentAccount) {
  const chatPanel = document.getElementById("chat-panel");
  const chatContent = document.getElementById("chat-content");
  const chatMessagesElem = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");
  const toggleChatBtn = document.getElementById("toggle-chat-btn");

  // 切換聊天室展開與收合（同步縮放寬度）
  toggleChatBtn.addEventListener("click", () => {
    if (chatPanel.classList.contains("collapsed")) {
      chatPanel.classList.remove("collapsed");
      chatContent.style.display = "flex";
    } else {
      chatPanel.classList.add("collapsed");
      chatContent.style.display = "none";
    }
  });

  // 監聽 Firebase 上的 chatHistory 並更新聊天室訊息
  function updateChatHistory() {
    const chatHistoryRef = ref(db, 'chatHistory');
    onValue(chatHistoryRef, (snapshot) => {
      const data = snapshot.val();
      chatMessagesElem.innerHTML = "";
      if (data) {
        let messages = Object.keys(data).map(key => data[key]);
        messages.sort((a, b) => a.timestamp - b.timestamp);
        messages.forEach(msg => {
          let div = document.createElement("div");
          div.innerText = `[${msg.account}] ${msg.message}`;
          chatMessagesElem.appendChild(div);
        });
        chatMessagesElem.scrollTop = chatMessagesElem.scrollHeight;
      }
    });
  }
  updateChatHistory();

  // 監聽聊天室輸入框，按下 Enter 鍵時送出訊息
  chatInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter" || e.keyCode === 13) {
      const message = chatInput.value.trim();
      if(!message) return;
      push(ref(db, 'chatHistory'), {
        account: currentAccount,
        message: message,
        timestamp: Date.now()
      });
      chatInput.value = "";
    }
  });
}
