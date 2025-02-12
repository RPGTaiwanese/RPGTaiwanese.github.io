// Firebase 網頁應用設定及初始化
// 此檔案功能：顯示 Google 登入在線人數以及其他用戶名，用戶的名字會預設在第一位

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Firebase 設定
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
const db = getDatabase(app);
const auth = getAuth();

// 在右上角顯示登入用戶名與在線人數
let onlineUsers = [];

// 監聽用戶登錄狀態
onAuthStateChanged(auth, (user) => {
  if (user) {
    const userName = user.displayName || "匿名用戶";
    addOnlineUser(userName);
  }
});

// 添加在線用戶並更新Firebase資料庫
function addOnlineUser(userName) {
  const onlineUsersRef = ref(db, "onlineUsers");
  
  // 取得目前在線用戶資料
  onValue(onlineUsersRef, (snapshot) => {
    onlineUsers = snapshot.val() || [];
    if (!onlineUsers.includes(userName)) {
      onlineUsers.push(userName);
      updateOnlineUsers();
    }
  });
}

// 更新 Firebase 中的在線用戶
function updateOnlineUsers() {
  const onlineUsersRef = ref(db, "onlineUsers");
  set(onlineUsersRef, onlineUsers);

  // 更新頁面顯示
  displayOnlineUsers();
}

// 顯示在線用戶於網頁右上角
function displayOnlineUsers() {
  const onlineUsersCount = onlineUsers.length;
  const onlineUserList = onlineUsers.join(", ");
  const userDisplay = `
    <div id="online-users" style="position: fixed; top: 10px; right: 10px; background: rgba(0, 0, 0, 0.7); color: white; padding: 10px; border-radius: 5px;">
      <strong>在線人數: ${onlineUsersCount}</strong><br>
      用戶名: ${userDisplay}
    </div>
  `;
  
  // 顯示到頁面
  document.body.insertAdjacentHTML("beforeend", userDisplay);
}

// 初始設定
document.addEventListener("DOMContentLoaded", function () {
  displayOnlineUsers();
});
