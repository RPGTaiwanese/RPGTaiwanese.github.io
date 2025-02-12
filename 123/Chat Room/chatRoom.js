// Firebase 聊天室 JS 檔案 - chatRoom.js
// 使用說明：
// 1. 把這個檔案放到 "Chat Room" 資料夾中。
// 2. 確保你有將Firebase SDK與這個檔案載入到你的HTML中。
// 3. 此檔案會自動檢查用戶是否已經登入Google帳號，如果未登入，會顯示Google登入按鈕。
// 4. 用戶登入後會顯示用戶的Google頭像，並可以使用浮動UI來發送訊息與貼圖。
// 5. 貼圖檔案會依照"Texture 1 (1)"、"Texture 1 (2)"等格式來顯示對應的貼圖。

// Import Firebase modules
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { getDatabase, ref, set, push, onChildAdded } from "firebase/database";

// Firebase 配置
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
const auth = getAuth();
const database = getDatabase(app);

// Google 登入提供者
const provider = new GoogleAuthProvider();

// 聊天室資料庫位置
const chatRoomRef = ref(database, 'chatRoom');

// 用戶登入狀態監聽
onAuthStateChanged(auth, (user) => {
  if (user) {
    showChatUI(user);
  } else {
    showLoginUI();
  }
});

// 顯示聊天室界面
function showChatUI(user) {
  document.getElementById('chatUI').style.display = 'block';
  document.getElementById('loginUI').style.display = 'none';
  document.getElementById('userName').textContent = user.displayName;
  document.getElementById('userPhoto').src = user.photoURL;

  // 加載聊天室訊息
  loadMessages();

  // 送出訊息與貼圖
  document.getElementById('sendButton').onclick = () => {
    const message = document.getElementById('messageInput').value;
    const image = document.querySelector('input[name="sticker"]:checked')?.value;
    if (message || image) {
      sendMessage(user, message, image);
      document.getElementById('messageInput').value = '';
    }
  };

  // 登出功能
  document.getElementById('logoutButton').onclick = () => {
    signOut(auth).then(() => {
      // 成功登出
    }).catch((error) => {
      console.error("登出失敗", error);
    });
  };
}

// 顯示登入UI
function showLoginUI() {
  document.getElementById('chatUI').style.display = 'none';
  document.getElementById('loginUI').style.display = 'block';
  document.getElementById('googleLoginButton').onclick = () => {
    signInWithPopup(auth, provider).then((result) => {
      // 登入成功
    }).catch((error) => {
      console.error("Google 登入失敗", error);
    });
  };
}

// 載入訊息
function loadMessages() {
  onChildAdded(chatRoomRef, (data) => {
    const messageData = data.val();
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.innerHTML = `
      <img src="${messageData.userPhoto}" alt="User" class="user-photo">
      <span class="user-name">${messageData.userName}</span>: ${messageData.message}
      ${messageData.image ? `<img src="${messageData.image}" class="sticker">` : ''}
    `;
    document.getElementById('messageList').appendChild(messageElement);
  });
}

// 送出訊息或貼圖
function sendMessage(user, message, image) {
  const newMessageRef = push(chatRoomRef);
  set(newMessageRef, {
    userName: user.displayName,
    userPhoto: user.photoURL,
    message: message,
    image: image || ''
  });
}

// 貼圖選項
function loadStickers() {
  const stickers = ['Texture 1 (1)', 'Texture 1 (2)', 'Texture 2 (1)', 'Texture 2 (2)']; // 貼圖格式
  const stickersContainer = document.getElementById('stickersContainer');
  stickers.forEach(sticker => {
    const stickerOption = document.createElement('input');
    stickerOption.type = 'radio';
    stickerOption.name = 'sticker';
    stickerOption.value = `path_to_sticker_images/${sticker}.png`; // 假設貼圖儲存在特定路徑
    const stickerLabel = document.createElement('label');
    stickerLabel.textContent = sticker;
    stickersContainer.appendChild(stickerOption);
    stickersContainer.appendChild(stickerLabel);
  });
}

// 初始載入貼圖
loadStickers();
