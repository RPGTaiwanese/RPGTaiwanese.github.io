/*
 * online-users-display.js
 *
 * 功能：
 *  - 在網頁右上角顯示透過 Google 登入的在線用戶數量、用戶名稱以及頭像。
 *  - 視窗背景為透明暗黑色。
 *  - 畫面中，用戶自己（目前登入者）的名字會預設顯示在第一位。
 *
 * 使用方法：
 *  1. 將此檔案放置於 online-users-display 資料夾中。
 *  2. 在 HTML 中以 ES module 方式引入此檔案，例如：
 *       <script type="module" src="online-users-display/online-users-display.js"></script>
 *  3. 請確認已在專案中安裝 Firebase 並更新 firebaseConfig 為您的專案憑證。
 *
 * 相依性：
 *  - Firebase App、Analytics、Authentication 及 Realtime Database 模組
 *
 * 說明：
 *  此檔案會初始化 Firebase，若使用者尚未登入則以 Google 登入，
 *  並於 Firebase Realtime Database 的 "onlineUsers" 節點中更新使用者的在線狀態（連線時寫入，斷線時自動移除）。
 *  同時，它會監聽在線用戶資料的變動並動態更新網頁右上角的 UI 顯示。
 */

// Import Firebase 模組
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, set, onDisconnect, onValue } from "firebase/database";

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
const auth = getAuth();
const database = getDatabase(app);

// 建立 UI 容器 (右上角，透明暗黑色視窗)
const container = document.createElement("div");
container.id = "online-users-container";
container.style.position = "fixed";
container.style.top = "10px";
container.style.right = "10px";
container.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
container.style.color = "#fff";
container.style.padding = "10px";
container.style.borderRadius = "5px";
container.style.zIndex = "9999";
document.body.appendChild(container);

// 更新 UI 顯示在線用戶列表
function updateUsersUI(users) {
  container.innerHTML = "";
  
  // 顯示在線人數
  const countDiv = document.createElement("div");
  countDiv.textContent = `在線人數：${users.length}`;
  countDiv.style.fontWeight = "bold";
  countDiv.style.marginBottom = "5px";
  container.appendChild(countDiv);
  
  // 顯示每個用戶的頭像及名稱
  users.forEach((user) => {
    const userDiv = document.createElement("div");
    userDiv.style.display = "flex";
    userDiv.style.alignItems = "center";
    userDiv.style.marginBottom = "5px";
    
    const avatar = document.createElement("img");
    avatar.src = user.photoURL;
    avatar.alt = user.displayName;
    avatar.style.width = "30px";
    avatar.style.height = "30px";
    avatar.style.borderRadius = "50%";
    avatar.style.marginRight = "8px";
    
    const nameSpan = document.createElement("span");
    nameSpan.textContent = user.displayName;
    
    userDiv.appendChild(avatar);
    userDiv.appendChild(nameSpan);
    container.appendChild(userDiv);
  });
}

// 設定使用者在線狀態至 Firebase Realtime Database
function setUserOnline(user) {
  const userStatusRef = ref(database, 'onlineUsers/' + user.uid);
  set(userStatusRef, {
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL,
    lastActive: Date.now()
  });
  // 當使用者斷線時自動移除該數據
  onDisconnect(userStatusRef).remove();
}

// 從資料庫抓取並顯示在線用戶，將目前使用者預設排在第一位
function fetchAndDisplayOnlineUsers(currentUser) {
  const onlineUsersRef = ref(database, 'onlineUsers/');
  onValue(onlineUsersRef, (snapshot) => {
    const onlineUsers = snapshot.val() || {};
    const usersArray = Object.values(onlineUsers);
    
    // 排序：將目前使用者排在第一位
    usersArray.sort((a, b) => {
      if (a.uid === currentUser.uid) return -1;
      if (b.uid === currentUser.uid) return 1;
      return 0;
    });
    
    updateUsersUI(usersArray);
  });
}

// 監聽使用者認證狀態
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 使用者已登入
    setUserOnline(user);
    fetchAndDisplayOnlineUsers(user);
  } else {
    // 尚未登入則以 Google 登入
    signInWithPopup(auth, new GoogleAuthProvider())
      .then((result) => {
        const signedInUser = result.user;
        setUserOnline(signedInUser);
        fetchAndDisplayOnlineUsers(signedInUser);
      })
      .catch((error) => {
        console.error("Google 登入錯誤：", error);
      });
  }
});
