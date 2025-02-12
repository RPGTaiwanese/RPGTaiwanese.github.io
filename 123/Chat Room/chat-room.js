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

// 建立聊天室容器
const chatContainer = document.createElement('div');
chatContainer.id = "firebase-chat-container";
chatContainer.style.position = "fixed";
chatContainer.style.bottom = "20px";
chatContainer.style.right = "20px";
chatContainer.style.width = "300px";
chatContainer.style.height = "400px";
chatContainer.style.background = "white";
chatContainer.style.border = "1px solid #ccc";
chatContainer.style.borderRadius = "5px";
chatContainer.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
chatContainer.style.display = "flex";
chatContainer.style.flexDirection = "column";
document.body.appendChild(chatContainer);

// 聊天室標題列
const chatHeader = document.createElement('div');
chatHeader.style.display = "flex";
chatHeader.style.justifyContent = "space-between";
chatHeader.style.alignItems = "center";
chatHeader.style.background = "#007bff";
chatHeader.style.color = "white";
chatHeader.style.padding = "10px";
chatHeader.style.cursor = "move";
chatHeader.innerHTML = `<span>聊天室</span>`;

const enlargeButton = document.createElement('button');
enlargeButton.textContent = "🔍";
enlargeButton.style.background = "transparent";
enlargeButton.style.border = "none";
enlargeButton.style.color = "white";
enlargeButton.style.fontSize = "16px";
enlargeButton.style.cursor = "pointer";
chatHeader.appendChild(enlargeButton);

chatContainer.appendChild(chatHeader);

// 放大/縮小聊天室
let isExpanded = false;
enlargeButton.onclick = () => {
  if (isExpanded) {
    chatContainer.style.width = "300px";
    chatContainer.style.height = "400px";
  } else {
    chatContainer.style.width = "500px";
    chatContainer.style.height = "600px";
  }
  isExpanded = !isExpanded;
};

// 聊天訊息區
const chatMessages = document.createElement('div');
chatMessages.style.flex = "1";
chatMessages.style.overflowY = "auto";
chatMessages.style.padding = "10px";
chatMessages.style.background = "#f9f9f9";
chatContainer.appendChild(chatMessages);

// 輸入區
const chatInputContainer = document.createElement('div');
chatInputContainer.style.display = "flex";
chatInputContainer.style.borderTop = "1px solid #ccc";

const chatInput = document.createElement('input');
chatInput.type = "text";
chatInput.style.flex = "1";
chatInput.style.padding = "10px";

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

// 發送訊息函式
function sendMessage(user, text) {
  const messagesRef = ref(database, 'messages');
  push(messagesRef, {
    text: text,
    name: user.displayName,
    avatar: user.photoURL,
    timestamp: Date.now()
  });
}

// 顯示訊息
function appendMessage(msg) {
  const msgDiv = document.createElement('div');
  msgDiv.style.marginBottom = "10px";
  
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

// 監聽登入狀態
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

// 載入歷史訊息
function loadMessages() {
  const messagesRef = ref(database, 'messages');
  onChildAdded(messagesRef, (snapshot) => {
    const msg = snapshot.val();
    appendMessage(msg);
  });
}
