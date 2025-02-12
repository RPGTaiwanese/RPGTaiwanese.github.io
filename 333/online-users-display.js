/**
 * online-users-display.js
 * 功能說明：
 * 1. 在網頁右上角顯示Google登入的即時在線人數和用戶列表
 * 2. 當前登入用戶會固定顯示在列表第一位
 * 3. 自動處理用戶連線狀態和斷線偵測
 * 
 * 使用方式：
 * 1. 在HTML中加入：<script type="module" src="online-users-display.js"></script>
 * 2. 確保已正確引入Firebase SDK並初始化
 * 3. 在頁面中需要顯示登入按鈕的位置加入：<div id="auth-container"></div>
 * 4. 樣式可自行修改 #online-users-panel 的CSS
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { getDatabase, ref, set, onDisconnect, onValue, serverTimestamp } from "firebase/database";

// Firebase配置（替換為你自己的配置）
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// 初始化Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// 創建在線用戶面板
const createOnlineUsersPanel = () => {
  const panel = document.createElement('div');
  panel.id = 'online-users-panel';
  panel.style = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 15px;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 9999;
  `;
  
  panel.innerHTML = `
    <div id="auth-container"></div>
    <h3>在線用戶 (<span id="online-count">0</span>)</h3>
    <ul id="user-list" style="list-style: none; padding: 0; margin: 0;"></ul>
  `;
  
  document.body.appendChild(panel);
};

// 更新用戶列表顯示
const updateUserList = (users, currentUserId) => {
  const userList = document.getElementById('user-list');
  const onlineCount = document.getElementById('online-count');
  
  // 清空列表
  userList.innerHTML = '';
  
  // 分離當前用戶和其他用戶
  const currentUser = users.find(u => u.uid === currentUserId);
  const otherUsers = users.filter(u => u.uid !== currentUserId);
  
  // 組合排序後的列表（當前用戶在前）
  const sortedUsers = currentUser ? [currentUser, ...otherUsers] : otherUsers;
  
  sortedUsers.forEach(user => {
    const li = document.createElement('li');
    li.textContent = user.displayName + (user.uid === currentUserId ? ' (我)' : '');
    li.style.padding = '4px 0';
    userList.appendChild(li);
  });
  
  onlineCount.textContent = users.length;
};

// 處理用戶認證狀態
const handleAuthState = (user) => {
  const authContainer = document.getElementById('auth-container');
  
  if (user) {
    // 用戶已登入
    authContainer.innerHTML = `<button id="signout-button">登出</button>`;
    document.getElementById('signout-button').onclick = () => signOut(auth);
    
    // 在資料庫註冊在線狀態
    const userRef = ref(db, `onlineUsers/${user.uid}`);
    
    set(userRef, {
      uid: user.uid,
      displayName: user.displayName,
      lastOnline: serverTimestamp()
    });
    
    // 設定斷線處理
    onDisconnect(userRef).remove();
  } else {
    // 顯示登入按鈕
    authContainer.innerHTML = `<button id="google-login">使用Google帳號登入</button>`;
    document.getElementById('google-login').onclick = () => 
      signInWithPopup(auth, new GoogleAuthProvider());
  }
};

// 初始化函式
const init = () => {
  createOnlineUsersPanel();
  
  // 監聽認證狀態變化
  auth.onAuthStateChanged(user => {
    handleAuthState(user);
    
    // 監聽在線用戶列表
    const onlineUsersRef = ref(db, 'onlineUsers');
    onValue(onlineUsersRef, (snapshot) => {
      const users = [];
      snapshot.forEach(childSnapshot => {
        users.push(childSnapshot.val());
      });
      updateUserList(users, user?.uid);
    });
  });
};

// 啟動應用
init();